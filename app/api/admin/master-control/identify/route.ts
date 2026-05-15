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
        const { links = [], nomes = [], user_id } = await request.json();
        
        // 1. Processamento de LINKS (Existente)
        const resultadosLinks = await Promise.all(links.map(async (url: string) => {
            try {
                let produto = await prisma.produtos.findFirst({
                    where: { link_serie: url },
                    select: { id: true, nome: true, imagem_url: true, plataforma: true }
                });

                if (!produto) {
                    const metadata = await resolveMetadata(url);
                    if (metadata?.nome) {
                        const nomeLimpo = metadata.nome.trim();
                        produto = await prisma.produtos.upsert({
                            where: { nome: nomeLimpo },
                            update: { link_serie: url, updated_at: new Date() },
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

                if (produto) return await attachMetadata(produto, user_id);
                return null;
            } catch (err: any) {
                console.error(`❌ Erro ao identificar link ${url}:`, err.message);
                return null;
            }
        }));

        // 2. Processamento de NOMES (Novo)
        const resultadosNomesArray = await Promise.all(nomes.map(async (nomeRaw: string) => {
            try {
                const nome = nomeRaw.trim();
                if (!nome) return [];

                const produtosFound = await prisma.produtos.findMany({
                    where: {
                        OR: [
                            { nome: { contains: nome, mode: 'insensitive' } },
                            { nome_alternativo: { contains: nome, mode: 'insensitive' } }
                        ]
                    },
                    select: { id: true, nome: true, imagem_url: true, plataforma: true }
                });

                // Retorna todos os encontrados para este nome
                return await Promise.all(produtosFound.map(p => attachMetadata(p, user_id)));
            } catch (err: any) {
                console.error(`❌ Erro ao identificar nome ${nomeRaw}:`, err.message);
                return [];
            }
        }));

        const resultadosNomes = resultadosNomesArray.flat();

        // Função auxiliar para evitar repetição de código
        async function attachMetadata(produto: any, userId: string) {
            const lastSale = await prisma.vendas.findFirst({
                where: { user_id: userId, produto_id: produto.id },
                orderBy: { data_venda: 'desc' },
                select: { preco_unitario: true, grupo_id: true }
            });

            return {
                produto_id: produto.id,
                nome: produto.nome,
                imagem_url: produto.imagem_url,
                plataforma: produto.plataforma,
                valor: Number(lastSale?.preco_unitario || 1.00), // Default 1.00 se não houver anterior
                grupo_id: lastSale?.grupo_id || "" 
            };
        }

        const rawResults = [...resultadosLinks, ...resultadosNomes].filter(r => r !== null);
        
        // Remover duplicatas de produto_id caso o mesmo item seja encontrado por link e nome simultaneamente
        const uniqueResults = Array.from(
            new Map(rawResults.map(item => [item?.produto_id, item])).values()
        );

        return NextResponse.json(uniqueResults);

    } catch (error: any) {
        console.error("❌ Erro crítico no Identify:", error);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}