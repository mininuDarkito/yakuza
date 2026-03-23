import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// --- ATUALIZAR PRODUTO (PATCH) ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { nome, nome_alternativo, link_serie ,plataforma, imagem_url } = body

    const res = await sql.query(`
      UPDATE produtos 
      SET nome = $1, nome_alternativo = $2, link_serie = $3, plataforma = $4, imagem_url = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [nome, nome_alternativo, link_serie, plataforma,  imagem_url, id])

    if (res.rowCount === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    return NextResponse.json(res.rows[0])
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
  }
}

// --- EXCLUIR PRODUTO (DELETE) ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  try {
    // 1. Busca o nome antes de deletar para o log
    const productInfo = await sql.query(`SELECT nome FROM produtos WHERE id = $1`, [id])
    if (productInfo.rowCount === 0) return NextResponse.json({ error: "Não encontrado" }, { status: 404 })

    // 2. Deleta o produto (O CASCADE cuidará das tabelas vinculadas se configurado)
    await sql.query(`DELETE FROM produtos WHERE id = $1`, [id])

    // 3. Log de Auditoria
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'global_delete', 'produtos', $2)
    `, [session.user.id, JSON.stringify({ deleted_name: productInfo.rows[0].nome, product_id: id })])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Erro ao deletar produto:", error)
    return NextResponse.json({ error: "Erro ao excluir: Existem dependências no banco" }, { status: 500 })
  }
}