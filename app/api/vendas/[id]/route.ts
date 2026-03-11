import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

// --- BUSCAR UMA VENDA ESPECÍFICA (GET) ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const res = await sql.query(`
      SELECT v.*, p.nome as produto_nome, g.nome as grupo_nome
      FROM vendas v
      JOIN produtos p ON v.produto_id = p.id
      JOIN grupos g ON v.grupo_id = g.id
      WHERE v.id = $1 AND v.user_id = $2
    `, [id, userId])

    const venda = res.rows[0]

    if (!venda) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
    }

    return NextResponse.json(venda)
  } catch (error) {
    console.error("Erro ao buscar venda:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// --- DELETAR UMA VENDA (DELETE) ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    // 1. Deletar a venda garantindo que pertence ao usuário
    const res = await sql.query(`
      DELETE FROM vendas 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId])

    const vendaDeletada = res.rows[0]

    if (!vendaDeletada) {
      return NextResponse.json({ error: "Venda não encontrada ou permissão negada" }, { status: 404 })
    }

    // 2. Registrar no log de atividades
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'delete_venda', 'venda', $2)
    `, [userId, id])

    return NextResponse.json({ success: true, message: "Venda removida com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar venda:", error)
    return NextResponse.json({ error: "Erro interno ao deletar" }, { status: 500 })
  }
}