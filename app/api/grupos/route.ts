import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const grupoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  // No 'pg', usamos .query() e acessamos .rows
  const res = await sql.query(`
    SELECT g.*, 
           (SELECT COUNT(*) FROM produtos p WHERE p.grupo_id = g.id) as produtos_count
    FROM grupos g
    WHERE g.user_id = $1
    ORDER BY g.created_at DESC
  `, [userId])

  return NextResponse.json(res.rows)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = grupoSchema.parse(body)

    // 1. Inserir o grupo e retornar o resultado
    const resGrupo = await sql.query(`
      INSERT INTO grupos (user_id, nome, descricao)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, data.nome, data.descricao || null])

    const grupo = resGrupo.rows[0]

    // 2. Log de atividade (Usando o ID do grupo recém-criado)
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'create', 'grupo', $2)
    `, [userId, grupo.id])

    return NextResponse.json(grupo, { status: 201 })
  } catch (error) {
    console.error("Erro na API de Grupos:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}