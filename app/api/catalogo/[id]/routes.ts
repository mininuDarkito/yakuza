import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  // BLOQUEIO DE SEGURANÇA: Só Admin passa daqui
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso negado: Requer Admin" }, { status: 403 })
  }

  try {
    // 1. Deletar do catálogo global (tabela produtos)
    // Se você configurou 'onDelete: Cascade' no Prisma, isso vai limpar
    // automaticamente todas as user_series de todos os usuários.
    const res = await sql.query(`DELETE FROM produtos WHERE id = $1 RETURNING nome`, [id])

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Série não encontrada no catálogo" }, { status: 404 })
    }

    const nomeProduto = res.rows[0].nome

    // 2. Log de Auditoria (Saber qual Admin apagou)
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'full_catalog_delete', 'produtos', $2)
    `, [session.user.id, JSON.stringify({ product_id: id, product_name: nomeProduto })])

    return NextResponse.json({ 
      success: true, 
      message: `A obra "${nomeProduto}" foi removida de todo o sistema.` 
    })
  } catch (error) {
    console.error("❌ Erro ao deletar do catálogo:", error)
    return NextResponse.json({ error: "Erro ao remover produto do catálogo global" }, { status: 500 })
  }
}