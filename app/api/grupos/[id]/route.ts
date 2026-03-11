import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const grupoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  const [grupo] = await sql`
    SELECT * FROM grupos WHERE id = ${id} AND user_id = ${session.user.id}
  `

  if (!grupo) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
  }

  return NextResponse.json(grupo)
}

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

    const [grupo] = await sql`
      UPDATE grupos
      SET nome = ${data.nome}, descricao = ${data.descricao || null}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${session.user.id}
      RETURNING *
    `

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Log activity
    await sql`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES (${session.user.id}, 'update', 'grupo', ${id})
    `

    return NextResponse.json(grupo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  // Check if grupo has produtos
  const [produtosCount] = await sql`
    SELECT COUNT(*) as count FROM produtos WHERE grupo_id = ${id}
  `

  if (Number(produtosCount.count) > 0) {
    return NextResponse.json(
      { error: "Não é possível excluir um grupo com produtos" },
      { status: 400 }
    )
  }

  const [grupo] = await sql`
    DELETE FROM grupos WHERE id = ${id} AND user_id = ${session.user.id}
    RETURNING *
  `

  if (!grupo) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
  }

  // Log activity
  await sql`
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
    VALUES (${session.user.id}, 'delete', 'grupo', ${id})
  `

  return NextResponse.json({ success: true })
}
