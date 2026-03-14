import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

// Importação centralizada (Usando o seu resolver para limpar o código)
import { resolveMetadata } from "@/lib/scrapers"

export const dynamic = "force-dynamic";

// --- MÉTODO GET: LISTAGEM DO CATÁLOGO ---
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 35 
  const offset = (page - 1) * limit
  const search = searchParams.get("search") || ""

  try {
    const res = await sql.query(`
      SELECT 
        p.id, p.nome, p.plataforma, p.imagem_url, p.nome_alternativo, p.created_at, p.descricao,
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
      WHERE p.nome ILIKE $1 OR p.nome_alternativo ILIKE $1 OR p.descricao ILIKE $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [`%${search}%`, limit, offset])

    const countRes = await sql.query(
      `SELECT COUNT(*)::int FROM produtos WHERE nome ILIKE $1 OR nome_alternativo ILIKE $1`,
      [`%${search}%`]
    )

    const totalItems = countRes.rows[0].count

    return NextResponse.json({
      items: res.rows,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems
    })

  } catch (error) {
    console.error("❌ Erro na Listagem Admin:", error)
    return NextResponse.json({ error: "Erro ao carregar catálogo" }, { status: 500 })
  }
}

// --- MÉTODO POST: IMPORTAÇÃO EM MASSA (AUTO-BULK) ---
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  try {
    const { links } = await request.json()
    const listaLinks = [...new Set((links as string).split(/[\s,\n,]+/).filter((l) => l.startsWith('http')))]
    
    const resultados = { sucessos: 0, falhas: 0, detalhes: [] as string[] }

    for (const url of listaLinks) {
      try {
        // Usando o seu resolver centralizado
        const metadata = await resolveMetadata(url)

        if (!metadata || !metadata.nome) {
          resultados.falhas++
          continue
        }

        await sql.query(`
          INSERT INTO produtos (nome, nome_alternativo, descricao, imagem_url, link_serie, plataforma, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (nome) 
          DO UPDATE SET 
            nome_alternativo = COALESCE(EXCLUDED.nome_alternativo, produtos.nome_alternativo),
            descricao = EXCLUDED.descricao,
            imagem_url = COALESCE(EXCLUDED.imagem_url, produtos.imagem_url),
            link_serie = EXCLUDED.link_serie,
            plataforma = EXCLUDED.plataforma,
            updated_at = NOW()
        `, [
          metadata.nome, 
          metadata.nome_alternativo, 
          metadata.descricao, 
          metadata.imagem_url, 
          url, 
          metadata.plataforma || 'auto'
        ])

        resultados.sucessos++
        resultados.detalhes.push(`${metadata.nome} (OK)`)
      } catch (err) {
        console.error(`Erro ao processar link: ${url}`, err)
        resultados.falhas++
      }
    }

    return NextResponse.json(resultados)

  } catch (error) {
    console.error("❌ Erro no Auto-Bulk:", error)
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}