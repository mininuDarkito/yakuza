import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
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
  const plataforma = searchParams.get("plataforma") || "todos"

  try {
    const searchPattern = `%${search}%`;
    
    // Usando queryRaw para manter a performance das subqueries e agregação JSON complexa
    const items = await prisma.$queryRaw`
      SELECT 
        p.id, p.nome, p.plataforma, p.link_serie, p.imagem_url, p.nome_alternativo, p.created_at, p.descricao,
        (SELECT COUNT(*)::int FROM vendas WHERE produto_id = p.id) as total_vendas_count,
        (SELECT COUNT(DISTINCT user_id)::int FROM user_series WHERE produto_id = p.id) as total_vendedores,
        (SELECT COUNT(DISTINCT grupo_id)::int FROM user_series WHERE produto_id = p.id) as total_grupos,
        (
          SELECT json_agg(json_build_object(
            'vendedor', u.discord_username,
            'grupo', g.nome,
            'preco', gs.preco
          ))
          FROM user_series us
          JOIN users u ON u.id = us.user_id
          JOIN grupos g ON g.id = us.grupo_id
          JOIN grupo_series gs ON gs.produto_id = us.produto_id AND gs.grupo_id = us.grupo_id
          WHERE us.produto_id = p.id
        ) as detalhe_vendedores
      FROM produtos p
      WHERE (p.nome ILIKE ${searchPattern} OR p.nome_alternativo ILIKE ${searchPattern} OR p.descricao ILIKE ${searchPattern})
      ${plataforma !== "todos" ? prisma.$queryRaw`AND p.plataforma = ${plataforma}` : prisma.$queryRaw``}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Contagem total para paginação
    const countRes: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int FROM produtos 
        WHERE (nome ILIKE ${searchPattern} OR nome_alternativo ILIKE ${searchPattern} OR descricao ILIKE ${searchPattern})
        ${plataforma !== "todos" ? prisma.$queryRaw`AND plataforma = ${plataforma}` : prisma.$queryRaw``}
    `;

    const totalItems = countRes[0].count;

    // Lista de plataformas únicas
    const platRes = await prisma.produtos.findMany({
        where: {
            plataforma: { not: null, notIn: [''] }
        },
        select: { plataforma: true },
        distinct: ['plataforma']
    });
    const plataformas = platRes.map(r => r.plataforma).filter(Boolean).sort();

    return NextResponse.json({
      items,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems,
      plataformas
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

    // Processamento em lote (limitado para evitar timeout, mas Prisma ajuda na performance)
    for (const url of listaLinks) {
      try {
        const metadata = await resolveMetadata(url)

        if (!metadata || !metadata.nome) {
          resultados.falhas++
          continue
        }

        await prisma.produtos.upsert({
            where: { nome: metadata.nome },
            update: {
                nome_alternativo: metadata.nome_alternativo || undefined,
                descricao: metadata.descricao || undefined,
                imagem_url: metadata.imagem_url || undefined,
                link_serie: url,
                plataforma: metadata.plataforma || 'auto',
                updated_at: new Date(),
            },
            create: {
                nome: metadata.nome,
                nome_alternativo: metadata.nome_alternativo,
                descricao: metadata.descricao || "",
                imagem_url: metadata.imagem_url || "",
                link_serie: url,
                plataforma: metadata.plataforma || 'auto',
            }
        });

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