import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    
    // Tratamento de preço (string "10,50" -> number 10.50)
    const precoTratado = typeof body.preco === 'string' 
      ? parseFloat(body.preco.replace(',', '.')) 
      : body.preco;

    const data = produtoSchema.parse({ ...body, preco: precoTratado })

    // 1. Inserir ou buscar a série no catálogo Global (produtos)
    const resProduto = await sql.query(`
      INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (nome) DO UPDATE SET 
        plataforma = COALESCE(EXCLUDED.plataforma, produtos.plataforma),
        imagem_url = COALESCE(EXCLUDED.imagem_url, produtos.imagem_url)
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

    return NextResponse.json(resVinculo.rows[0], { status: 201 })
  } catch (error) {
    console.error("Erro na API de Produtos:", error)
    return NextResponse.json({ error: "Erro ao processar série" }, { status: 500 })
  }
}

// GET permanece igual ao seu para listar as séries
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const res = await sql.query(`
    SELECT p.*, us.preco, us.ativo, g.nome as grupo_nome, us.grupo_id
    FROM produtos p
    LEFT JOIN user_series us ON p.id = us.produto_id AND us.user_id = $1
    LEFT JOIN grupos g ON us.grupo_id = g.id
    ORDER BY p.nome ASC
  `, [userId])

  return NextResponse.json(res.rows)
}