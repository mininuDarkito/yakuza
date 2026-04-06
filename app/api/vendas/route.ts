import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const vendaSchema = z.object({
  produto_id: z.string().uuid("Série inválida"),
  grupo_id: z.string().uuid("Grupo inválido"), // Agora obrigatório vir do Form
  capitulos: z.array(z.number()).min(1, "Informe ao menos um capítulo"),
  preco_unitario: z.number().positive("Preço deve ser positivo"),
  observacoes: z.string().optional(),
  data_venda: z.string().optional(),
})

// --- LISTAGEM DE VENDAS (GET) ---
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get("mes")
  const ano = searchParams.get("ano")

  // Query otimizada para o novo design (traz faturamento e dados da obra)
  let query = `
    SELECT 
      v.*, 
      p.nome as produto_nome, 
      p.imagem_url as produto_imagem,
      p.plataforma as produto_plataforma,
      g.nome as grupo_nome
    FROM vendas v
    JOIN produtos p ON v.produto_id = p.id
    JOIN grupos g ON v.grupo_id = g.id
    WHERE v.user_id = $1
  `
  const values: any[] = [userId]

  if (mes && ano) {
    values.push(mes, ano)
    query += ` AND EXTRACT(MONTH FROM v.data_venda) = $2 AND EXTRACT(YEAR FROM v.data_venda) = $3`
  }

  query += ` ORDER BY v.data_venda DESC, v.created_at DESC`

  const res = await sql.query(query, values)
  return NextResponse.json(res.rows)
}

// --- REGISTRO DE VENDAS (POST) ---
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const data = vendaSchema.parse(body)

    // 1. Validar se o vínculo específico existe (User + Produto + Grupo)
    const resVinculo = await sql.query(`
      SELECT id FROM user_series 
      WHERE produto_id = $1 AND user_id = $2 AND grupo_id = $3 AND ativo = true
    `, [data.produto_id, userId, data.grupo_id])

    if (resVinculo.rowCount === 0) {
      return NextResponse.json({ error: "Vínculo com este grupo não encontrado ou inativo." }, { status: 404 })
    }

    // 2. Verificar duplicatas no grupo específico
    const resExistentes = await sql.query(`
      SELECT quantidade FROM vendas 
      WHERE user_id = $1 AND produto_id = $2 AND grupo_id = $3 AND quantidade = ANY($4)
    `, [userId, data.produto_id, data.grupo_id, data.capitulos])

    const capsExistentes = resExistentes.rows.map(r => r.quantidade)
    const capsParaSalvar = data.capitulos.filter(cap => !capsExistentes.includes(cap))

    if (capsParaSalvar.length === 0) {
      return NextResponse.json({ 
        error: "Capítulo(s) já registrado(s) neste grupo." 
      }, { status: 400 })
    }

    const dataVendaFinal = data.data_venda ? new Date(data.data_venda) : new Date()
    const vendasRegistradas = []

    await sql.query("BEGIN")

    try {
      for (const cap of capsParaSalvar) {
        const resVenda = await sql.query(`
          INSERT INTO vendas (
            user_id, produto_id, grupo_id, quantidade, 
            preco_unitario, preco_total, observacoes, data_venda
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          userId, 
          data.produto_id, 
          data.grupo_id, 
          cap, 
          data.preco_unitario, 
          data.preco_unitario, // preco_total por capítulo
          data.observacoes || null, 
          dataVendaFinal.toISOString()
        ])
        vendasRegistradas.push(resVenda.rows[0])
      }

      await sql.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
        VALUES ($1, 'venda_lote', 'venda', $2, $3)
      `, [userId, data.produto_id, JSON.stringify({ caps: capsParaSalvar, grupo: data.grupo_id })])

      await sql.query("COMMIT")
    } catch (dbError) {
      await sql.query("ROLLBACK")
      throw dbError
    }

    return NextResponse.json({ 
      message: `${vendasRegistradas.length} capítulo(s) registrado(s).`,
      vendas: vendasRegistradas 
    }, { status: 201 })

  } catch (error: any) {
    console.error("Erro na API de Vendas:", error)
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}