import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  
  // GARANTIR QUE SEJAM NÚMEROS (Prevenção de Erro 500)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 20 
  const offset = (page - 1) * limit
  const search = searchParams.get("search") || ""

  try {
    // 1. Busca os itens com contagens e detalhes dos vendedores
    // Usamos ILIKE para busca insensível a maiúsculas/minúsculas
    const res = await sql.query(`
      SELECT 
        p.id, 
        p.nome, 
        p.plataforma, 
        p.imagem_url, 
        p.nome_alternativo,
        p.created_at,
        (SELECT COUNT(*)::int FROM vendas WHERE produto_id = p.id) as total_vendas_count,
        (SELECT COUNT(DISTINCT user_id)::int FROM user_series WHERE produto_id = p.id) as total_vendedores,
        (SELECT COUNT(DISTINCT grupo_id)::int FROM user_series WHERE produto_id = p.id) as total_grupos,
        (
          SELECT json_agg(json_build_object(
            'vendedor', u.discord_username,
            'grupo', g.nome,
            'preco', us.preco
          ))
          FROM user_series us
          JOIN users u ON u.id = us.user_id
          JOIN grupos g ON g.id = us.grupo_id
          WHERE us.produto_id = p.id
        ) as detalhe_vendedores
      FROM produtos p
      WHERE p.nome ILIKE $1 OR p.nome_alternativo ILIKE $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${search}%`, limit, offset])

    // 2. Busca o total para calcular as páginas
    const countRes = await sql.query(
      `SELECT COUNT(*)::int FROM produtos WHERE nome ILIKE $1 OR nome_alternativo ILIKE $1`,
      [`%${search}%`]
    )

    const totalItems = countRes.rows[0].count
    const totalPages = Math.ceil(totalItems / limit)

    return NextResponse.json({
      items: res.rows,
      totalPages: totalPages,
      totalItems: totalItems
    })

  } catch (error) {
    console.error("❌ Erro na Query de Produtos Admin:", error)
    return NextResponse.json({ error: "Erro ao processar catálogo" }, { status: 500 })
  }
}