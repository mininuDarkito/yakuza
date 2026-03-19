import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { resolveMetadata } from "@/lib/scrapers";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    
    // 1. Bloqueio de Segurança: Apenas Admins
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const { links, user_id } = await request.json();
        const resultados = [];

        for (const url of links) {
            try {
                // 2. Busca inicial por LINK_SERIE
                let productRes = await sql.query(
                    `SELECT id, nome, imagem_url, plataforma FROM produtos WHERE link_serie = $1`, 
                    [url]
                );

                let produto = productRes.rows[0];

                // 3. Se não achou pelo link, roda o scraper
                if (!produto) {
                    const metadata = await resolveMetadata(url);
                    
                    if (metadata?.nome) {
                        const nomeLimpo = metadata.nome.trim();

                        // 4. UPSERT: Insere ou, se o NOME já existir, atualiza o link e recupera o registro
                        // Isso resolve o erro "duplicate key value violates unique constraint"
                        const upsertRes = await sql.query(`
                            INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma, updated_at)
                            VALUES ($1, $2, $3, $4, $5, NOW())
                            ON CONFLICT (nome) 
                            DO UPDATE SET 
                                link_serie = EXCLUDED.link_serie,
                                updated_at = NOW()
                            RETURNING id, nome, imagem_url, plataforma
                        `, [
                            nomeLimpo, 
                            metadata.descricao || "", 
                            metadata.imagem_url, 
                            url, 
                            metadata.plataforma || 'auto'
                        ]);
                        
                        produto = upsertRes.rows[0];
                    }
                }

                if (produto) {
                    // 5. LÓGICA DE PREÇO E GRUPO (Sugestão automática)
                    const lastSaleRes = await sql.query(`
                        SELECT preco_unitario, grupo_id
                        FROM vendas 
                        WHERE user_id = $1 AND produto_id = $2 
                        ORDER BY data_venda DESC LIMIT 1
                    `, [user_id, produto.id]);

                    const lastSale = lastSaleRes.rows[0];

                    resultados.push({
                        produto_id: produto.id,
                        nome: produto.nome,
                        imagem_url: produto.imagem_url,
                        plataforma: produto.plataforma,
                        valor: lastSale?.preco_unitario || 0.00,
                        grupo_id: lastSale?.grupo_id || "" 
                    });
                }
            } catch (err: any) {
                // Log detalhado para debugar falhas no scraper ou banco
                console.error(`❌ Erro ao identificar link ${url}:`, err.message);
            }
        }

        return NextResponse.json(resultados);

    } catch (error: any) {
        console.error("❌ Erro crítico no Identify:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}