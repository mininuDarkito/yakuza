import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

// Schema de validação para criação/vínculo
const produtoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  preco: z.number().positive("Preço deve ser positivo"),
  ativo: z.boolean().default(true),
  grupo_id: z.string().uuid("Grupo inválido"),
  imagem_url: z.string().optional().nullable(),
  link_serie: z.string().url("URL inválida").optional().nullable(),
  plataforma: z.string().optional().nullable(),
})

// --- GET: LISTAGEM HÍBRIDA ---
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // 1. Lógica para ADMIN: Retorna o catálogo global completo para o SeriesManager
    if (session.user.role === 'admin') {
      const resAdmin = await sql.query(`
        SELECT id, nome, plataforma, created_at, imagem_url
        FROM produtos 
        ORDER BY nome ASC
      `)
      return NextResponse.json(resAdmin.rows)
    }

    // 2. Lógica para USUÁRIO: Retorna as séries com o vínculo do vendedor
    const resUser = await sql.query(`
      SELECT 
        p.id, 
        p.nome, 
        p.plataforma, 
        p.imagem_url,
        us.preco, 
        us.ativo, 
        g.nome as grupo_nome, 
        us.grupo_id
      FROM produtos p
      LEFT JOIN user_series us ON p.id = us.produto_id AND us.user_id = $1
      LEFT JOIN grupos g ON us.grupo_id = g.id
      ORDER BY p.nome ASC
    `, [userId])

    return NextResponse.json(resUser.rows)

  } catch (error) {
    console.error("❌ Erro no GET produtos:", error)
    return NextResponse.json({ error: "Erro ao buscar dados" }, { status: 500 })
  }
}

// --- POST: CRIAÇÃO GLOBAL + VÍNCULO PRIVADO ---
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Tratamento de preço (string "10,50" -> number 10.50)
    const precoTratado = typeof body.preco === 'string' 
      ? parseFloat(body.preco.replace(',', '.')) 
      : body.preco;

    const data = produtoSchema.parse({ ...body, preco: precoTratado })

    // 1. Inserir ou buscar a série no catálogo Global (produtos)
    // Se o nome já existir, atualiza plataforma e imagem se estiverem vazios
    const resProduto = await sql.query(`
      INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (nome) DO UPDATE SET 
        plataforma = COALESCE(produtos.plataforma, EXCLUDED.plataforma),
        imagem_url = COALESCE(produtos.imagem_url, EXCLUDED.imagem_url)
      RETURNING id
    `, [data.nome, data.descricao, data.imagem_url, data.link_serie, data.plataforma])

    const produtoId = resProduto.rows[0].id

    // 2. Criar ou atualizar o vínculo Privado (user_series)
    const resVinculo = await sql.query(`
      INSERT INTO user_series (user_id, produto_id, grupo_id, preco, ativo, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, produto_id) DO UPDATE SET
        preco = EXCLUDED.preco,
        grupo_id = EXCLUDED.grupo_id,
        ativo = EXCLUDED.ativo,
        updated_at = NOW()
      RETURNING *
    `, [userId, produtoId, data.grupo_id, data.preco, data.ativo])

    // 3. Log opcional para Auditoria
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'link_product', 'user_series', $2)
    `, [userId, produtoId])

    return NextResponse.json(resVinculo.rows[0], { status: 201 })

  } catch (error) {
    console.error("❌ Erro no POST produtos:", error)
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao processar série" }, { status: 500 })
  }
}