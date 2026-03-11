import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const produtoSchema = z.object({
  grupo_id: z.string().uuid("Grupo inválido"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  preco: z.number().positive("Preço deve ser positivo"),
  ativo: z.boolean().default(true),
  imagem_url: z.string().optional().nullable(),
  link_serie: z.string().url("Link inválido").optional().nullable(),
  plataforma: z.string().optional().nullable(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id } = await params

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  // Busca dados globais da série + dados privados do usuário
  const res = await sql.query(`
    SELECT p.*, us.preco, us.ativo, us.grupo_id, g.nome as grupo_nome
    FROM produtos p
    LEFT JOIN user_series us ON p.id = us.produto_id AND us.user_id = $2
    LEFT JOIN grupos g ON us.grupo_id = g.id
    WHERE p.id = $1
  `, [id, userId])

  const produto = res.rows[0]
  if (!produto) return NextResponse.json({ error: "Série não encontrada" }, { status: 404 })

  return NextResponse.json(produto)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id: produtoId } = await params

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    // Tratamento de preço caso venha como string
    const precoTratado = typeof body.preco === 'string' 
      ? parseFloat(body.preco.replace(',', '.')) 
      : body.preco;

    const data = produtoSchema.parse({ ...body, preco: precoTratado })

    // 1. Verificar se o grupo pertence ao usuário
    const resGrupo = await sql.query(
      'SELECT id FROM grupos WHERE id = $1 AND user_id = $2',
      [data.grupo_id, userId]
    )
    if (resGrupo.rows.length === 0) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // 2. UPSERT na tabela user_series (Configuração Privada)
    // Não alteramos a tabela 'produtos' global aqui para manter a integridade do catálogo
    const resUpdate = await sql.query(`
      INSERT INTO user_series (user_id, produto_id, grupo_id, preco, ativo)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, produto_id) DO UPDATE SET 
          grupo_id = EXCLUDED.grupo_id,
          preco = EXCLUDED.preco,
          ativo = EXCLUDED.ativo,
          updated_at = NOW()
      RETURNING *
    `, [userId, produtoId, data.grupo_id, data.preco, data.ativo])

    // 3. Log de atividade
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'update_config', 'produto', $2)
    `, [userId, produtoId])

    return NextResponse.json(resUpdate.rows[0])
  } catch (error) {
    console.error("Erro no PUT de Produto:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id: produtoId } = await params

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    // Apenas remove o VÍNCULO do usuário com a série, não a série global
    const resDelete = await sql.query(`
      DELETE FROM user_series 
      WHERE produto_id = $1 AND user_id = $2
      RETURNING *
    `, [produtoId, userId])

    if (resDelete.rows.length === 0) {
      return NextResponse.json({ error: "A Serie nao é sua" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}