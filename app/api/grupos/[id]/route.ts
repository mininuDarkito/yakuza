import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const grupoSchema = z.object({
  nome: z.string().min(1, "O nome do grupo é obrigatório"),
  channel_id: z.string().min(1, "O ID do canal do Discord é obrigatório"),
  descricao: z.string().optional(),
})

// --- GET: BUSCAR DETALHES DO GRUPO GLOBAL ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  // Qualquer usuário logado pode ver os detalhes (para carregar o form ou dashboard)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const res = await sql.query(
      "SELECT * FROM grupos WHERE id = $1",
      [id]
    )

    const grupo = res.rows[0]
    if (!grupo) {
      return NextResponse.json({ error: "Grupo global não encontrado" }, { status: 404 })
    }

    return NextResponse.json(grupo)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar grupo" }, { status: 500 })
  }
}

// --- PUT: ATUALIZAR CONFIGURAÇÃO DO GRUPO (ADMIN ONLY) ---
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  // Apenas Admins podem alterar a estrutura dos grupos globais
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const data = grupoSchema.parse(body)

    const res = await sql.query(`
      UPDATE grupos
      SET nome = $1, channel_id = $2, descricao = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [data.nome, data.channel_id, data.descricao || null, id])

    const grupo = res.rows[0]

    if (!grupo) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Log administrativo
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'update_global_group', 'grupo', $2, $3)
    `, [session.user.id, id, JSON.stringify({ nome: data.nome, channel: data.channel_id })])

    return NextResponse.json(grupo)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("❌ Erro no PUT grupo:", error)
    return NextResponse.json({ error: "Erro interno ao atualizar grupo" }, { status: 500 })
  }
}

// --- DELETE: REMOVER GRUPO GLOBAL (ADMIN ONLY) ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  const { id } = await params

  try {
    // 1. Verifica se existem vendas vinculadas
    // Diferente de user_series, se houver VENDAS, o DELETE deve ser bloqueado 
    // ou tratado para não quebrar o histórico financeiro da equipe.
    const resVendas = await sql.query(
      "SELECT COUNT(*)::int as count FROM vendas WHERE grupo_id = $1",
      [id]
    )

    if (resVendas.rows[0].count > 0) {
      return NextResponse.json(
        { error: "Impossível excluir: Este grupo possui histórico de vendas. Desative-o em vez de excluir." },
        { status: 400 }
      )
    }

    // 2. Remove vínculos de séries antes de deletar o grupo (Cascade manual caso não esteja no DB)
    await sql.query("DELETE FROM user_series WHERE grupo_id = $1", [id])

    // 3. Deleta o grupo
    const resDelete = await sql.query(
      "DELETE FROM grupos WHERE id = $1 RETURNING *",
      [id]
    )

    if (resDelete.rowCount === 0) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 })
    }

    // Log activity
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'delete_global_group', 'grupo', $2)
    `, [session.user.id, id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Erro no DELETE grupo:", error)
    return NextResponse.json({ error: "Erro interno ao excluir grupo" }, { status: 500 })
  }
}