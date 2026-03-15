import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";
import { resolveMetadata } from "@/lib/scrapers";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    
    // 1. Bloqueio de Segurança: Apenas Admins acessam o Controle Mestre
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const { links, user_id } = await request.json();
        const resultados = [];

        for (const url of links) {
            try {
                // 2. Tenta encontrar o produto pelo link original no banco
                let productRes = await sql.query(
                    `SELECT id, nome, imagem_url, plataforma FROM produtos WHERE link_serie = $1`, 
                    [url]
                );

                let produto = productRes.rows[0];

                // 3. Se não existe, usamos o Scraper para cadastrar agora mesmo
                if (!produto) {
                    const metadata = await resolveMetadata(url);
                    if (metadata?.nome) {
                        const insertRes = await sql.query(`
                            INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma, updated_at)
                            VALUES ($1, $2, $3, $4, $5, NOW())
                            RETURNING id, nome, imagem_url, plataforma
                        `, [
                            metadata.nome, 
                            metadata.descricao || "", 
                            metadata.imagem_url, 
                            url, 
                            metadata.plataforma || 'auto'
                        ]);
                        produto = insertRes.rows[0];
                    }
                }

                if (produto) {
                    // 4. LÓGICA INTELIGENTE: Busca o último preço que ESSE usuário usou nesta série
                    // Se ele nunca vendeu, o valor padrão será 0.00
                    const priceRes = await sql.query(`
                        SELECT preco_unitario 
                        FROM vendas 
                        WHERE user_id = $1 AND produto_id = $2 
                        ORDER BY data_venda DESC LIMIT 1
                    `, [user_id, produto.id]);

                    resultados.push({
                        produto_id: produto.id,
                        nome: produto.nome,
                        imagem_url: produto.imagem_url,
                        plataforma: produto.plataforma,
                        valor: priceRes.rows[0]?.preco_unitario || 0.00
                    });
                }
            } catch (err: any) {
                console.error(`Erro ao processar ${url}:`, err.message);
                // Ignora links inválidos ou erros de scraper e continua o bulk
            }
        }

        return NextResponse.json(resultados);

    } catch (error: any) {
        console.error("Erro crítico no Master Control Identify:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}