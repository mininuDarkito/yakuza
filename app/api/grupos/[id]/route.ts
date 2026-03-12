import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const grupoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
})

// --- GET: BUSCAR GRUPO ESPECÍFICO ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const res = await sql.query(
      "SELECT * FROM grupos WHERE id = $1 AND user_id = $2",
      [id, session.user.id]
    )

    const grupo = res.rows[0]

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    return NextResponse.json(grupo)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar grupo" }, { status: 500 })
  }
}

// --- PUT: ATUALIZAR GRUPO ---
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const data = grupoSchema.parse(body)

    const res = await sql.query(`
      UPDATE grupos
      SET nome = $1, descricao = $2, updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [data.nome, data.descricao || null, id, session.user.id])

    const grupo = res.rows[0]

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Log activity
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'update', 'grupo', $2)
    `, [session.user.id, id])

    return NextResponse.json(grupo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// --- DELETE: EXCLUIR GRUPO ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    // 1. Verifica se o grupo tem produtos vinculados (na tabela user_series)
    const resCount = await sql.query(
      "SELECT COUNT(*)::int as count FROM user_series WHERE grupo_id = $1",
      [id]
    )

    if (resCount.rows[0].count > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir um grupo com produtos vinculados" },
        { status: 400 }
      )
    }

    // 2. Tenta deletar
    const resDelete = await sql.query(
      "DELETE FROM grupos WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, session.user.id]
    )

    if (resDelete.rowCount === 0) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // 3. Log activity
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'delete', 'grupo', $2)
    `, [session.user.id, id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro no DELETE grupo:", error)
    return NextResponse.json({ error: "Erro interno ao excluir grupo" }, { status: 500 })
  }
}