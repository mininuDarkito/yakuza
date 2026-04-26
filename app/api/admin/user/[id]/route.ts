import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: userId } = await params;

        if (!session || (session.user?.role !== 'admin' && session.user?.id !== userId)) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const selectedYear = searchParams.get("year") || new Date().getFullYear().toString();

        // 1. DADOS DO USUÁRIO + GMV + BANNER usando Prisma
        const user = await prisma.users.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: { vendas: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // Soma total de GMV
        const gmvAggregate = await prisma.vendas.aggregate({
            _sum: { preco_total: true },
            where: { user_id: userId }
        });

        const userData = {
            ...user,
            gmv_total: Number(gmvAggregate._sum.preco_total || 0),
            total_vendas: user._count.vendas
        };

        // 2. CICLO DE PERFORMANCE (Mantido com queryRaw para facilitar o agrupamento por mês formatado)
        const monthlyPerformance = await prisma.$queryRaw`
            SELECT 
                TO_CHAR(data_venda AT TIME ZONE 'UTC', 'MM') as mes_index,
                TO_CHAR(data_venda AT TIME ZONE 'UTC', 'Mon') as mes_nome,
                SUM(preco_total)::float as total
            FROM vendas
            WHERE user_id = ${userId}::uuid
              AND EXTRACT(YEAR FROM data_venda AT TIME ZONE 'UTC') = ${parseInt(selectedYear)}
            GROUP BY mes_index, mes_nome
            ORDER BY mes_index ASC
        `;

        // 3. RANKING
        const topSeries = await prisma.vendas.groupBy({
            by: ['produto_id'],
            where: { user_id: userId },
            _count: { id: true },
            _sum: { preco_total: true },
            orderBy: {
                _count: { id: 'desc' }
            },
            take: 5
        });

        // Enriquecer o ranking com nomes de produtos
        const ranking = await Promise.all(topSeries.map(async (item) => {
            const produto = await prisma.produtos.findUnique({
                where: { id: item.produto_id },
                select: { nome: true }
            });
            return {
                nome: produto?.nome || "Desconhecido",
                qtd: item._count.id,
                receita: Number(item._sum.preco_total || 0)
            };
        }));

        return NextResponse.json({
            user: userData,
            performance: monthlyPerformance,
            ranking: ranking,
            year: selectedYear
        });

    } catch (error: any) {
        console.error("❌ Erro na API de Stats:", error.message);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}