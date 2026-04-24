import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveMetadata } from "@/lib/scrapers";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    
    // 1. Bloqueio de Segurança: Apenas Admins
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const { links, user_id } = await request.json();
        
        // Paralelização das requisições para evitar travamentos em listas longas
        const resultados = await Promise.all(links.map(async (url: string) => {
            try {
                // 2. Busca inicial por LINK_SERIE
                let produto = await prisma.produtos.findFirst({
                    where: { link_serie: url },
                    select: { id: true, nome: true, imagem_url: true, plataforma: true }
                });

                // 3. Se não achou pelo link, roda o scraper
                if (!produto) {
                    const metadata = await resolveMetadata(url);
                    
                    if (metadata?.nome) {
                        const nomeLimpo = metadata.nome.trim();

                        // 4. UPSERT: Insere ou, se o NOME já existir, atualiza o link
                        produto = await prisma.produtos.upsert({
                            where: { nome: nomeLimpo },
                            update: {
                                link_serie: url,
                                updated_at: new Date(),
                            },
                            create: {
                                nome: nomeLimpo,
                                descricao: metadata.descricao || "",
                                imagem_url: metadata.imagem_url,
                                link_serie: url,
                                plataforma: metadata.plataforma || 'auto',
                            },
                            select: { id: true, nome: true, imagem_url: true, plataforma: true }
                        });
                    }
                }

                if (produto) {
                    // 5. LÓGICA DE PREÇO E GRUPO (Sugestão automática baseada na última venda)
                    const lastSale = await prisma.vendas.findFirst({
                        where: {
                            user_id: user_id,
                            produto_id: produto.id
                        },
                        orderBy: { data_venda: 'desc' },
                        select: { preco_unitario: true, grupo_id: true }
                    });

                    return {
                        produto_id: produto.id,
                        nome: produto.nome,
                        imagem_url: produto.imagem_url,
                        plataforma: produto.plataforma,
                        valor: Number(lastSale?.preco_unitario || 0.00),
                        grupo_id: lastSale?.grupo_id || "" 
                    };
                }
                return null;
            } catch (err: any) {
                console.error(`❌ Erro ao identificar link ${url}:`, err.message);
                return null;
            }
        }));

        // Remove resultados nulos de falhas no processamento
        const finalResult = resultados.filter(r => r !== null);

        return NextResponse.json(finalResult);

    } catch (error: any) {
        console.error("❌ Erro crítico no Identify:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}