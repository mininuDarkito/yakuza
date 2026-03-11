import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

// Validação dos dados que vêm do VendaForm
const vendaSchema = z.object({
  produto_id: z.string().uuid("Série inválida"),
  capitulos: z.array(z.number().int()).min(1, "Informe ao menos um capítulo"),
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
  const grupoId = searchParams.get("grupo_id")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  let query = `
    SELECT v.*, p.nome as produto_nome, g.nome as grupo_nome
    FROM vendas v
    JOIN produtos p ON v.produto_id = p.id
    JOIN grupos g ON v.grupo_id = g.id
    WHERE v.user_id = $1
  `
  const values: any[] = [userId]

  if (grupoId) {
    values.push(grupoId)
    query += ` AND v.grupo_id = $${values.length}`
  }
  if (startDate && endDate) {
    values.push(startDate, endDate)
    query += ` AND v.data_venda >= $${values.length - 1} AND v.data_venda <= $${values.length}`
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

    // 1. Validar vínculo do usuário com a série e pegar o grupo_id
    const resVinculo = await sql.query(`
      SELECT us.grupo_id 
      FROM user_series us
      WHERE us.produto_id = $1 AND us.user_id = $2 AND us.ativo = true
    `, [data.produto_id, userId])

    const vinculo = resVinculo.rows[0]
    if (!vinculo) {
      return NextResponse.json({ error: "Série não configurada ou inativa." }, { status: 404 })
    }

    // 2. CONSULTA GLOBAL: Verificar quais capítulos já foram registrados para este grupo
    // Isso evita duplicatas antes de tentar inserir
    const resExistentes = await sql.query(`
      SELECT quantidade FROM vendas 
      WHERE user_id = $1 AND produto_id = $2 AND grupo_id = $3 AND quantidade = ANY($4)
    `, [userId, data.produto_id, vinculo.grupo_id, data.capitulos])

    const capsExistentes = resExistentes.rows.map(r => r.quantidade)
    
    // Filtramos apenas os capítulos que ainda NÃO existem no banco
    const capsParaSalvar = data.capitulos.filter(cap => !capsExistentes.includes(cap))

    if (capsParaSalvar.length === 0) {
      return NextResponse.json({ 
        error: "Todos os capítulos selecionados já foram registrados para este grupo." 
      }, { status: 400 })
    }

    const dataVendaFinal = data.data_venda ? new Date(data.data_venda) : new Date()
    const vendasRegistradas = []

    // 3. TRANSAÇÃO SQL (Garante que salve tudo ou nada)
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
          vinculo.grupo_id, 
          cap, 
          data.preco_unitario, 
          data.preco_unitario, 
          data.observacoes || null, 
          dataVendaFinal.toISOString()
        ])
        
        vendasRegistradas.push(resVenda.rows[0])
      }

      await sql.query(`
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
        VALUES ($1, 'bulk_create_venda', 'venda', $2)
      `, [userId, data.produto_id])

      await sql.query("COMMIT")

    } catch (dbError) {
      await sql.query("ROLLBACK")
      throw dbError
    }

    return NextResponse.json({ 
      message: `${vendasRegistradas.length} capítulo(s) registrado(s).`,
      pulados: capsExistentes.length,
      vendas: vendasRegistradas 
    }, { status: 201 })

  } catch (error) {
    console.error("Erro na API de Vendas:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno ao processar vendas" }, { status: 500 })
  }
}