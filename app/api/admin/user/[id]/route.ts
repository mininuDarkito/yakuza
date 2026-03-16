import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        const { id: userId } = await params;

        // --- NOVA REGRA DE SEGURANÇA ---
        // Se não houver sessão OU (não for admin E o ID solicitado for diferente do ID logado)
        if (!session || (session.user?.role !== 'admin' && session.user?.id !== userId)) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const selectedYear = searchParams.get("year") || new Date().getFullYear().toString();

        // 1. DADOS DO USUÁRIO + GMV + BANNER
        const userStats = await sql.query(`
            SELECT 
                u.id, u.discord_username, u.discord_id, u.discord_avatar, u.discord_banner, u.role, u.billing_setup,
                (SELECT COALESCE(SUM(preco_total), 0) FROM vendas WHERE user_id = $1) as gmv_total,
                (SELECT COUNT(*) FROM vendas WHERE user_id = $1) as total_vendas
            FROM users u
            WHERE u.id = $1
        `, [userId]);

        if (userStats.rows.length === 0) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // 2. CICLO DE PERFORMANCE (USANDO ::FLOAT PARA GARANTIR SOMA NO JS)
        const monthlyPerformance = await sql.query(`
            SELECT 
                TO_CHAR(data_venda, 'MM') as mes_index,
                TO_CHAR(data_venda, 'Mon') as mes_nome,
                SUM(preco_total)::float as total
            FROM vendas
            WHERE user_id = $1 
              AND EXTRACT(YEAR FROM data_venda) = $2
            GROUP BY mes_index, mes_nome
            ORDER BY mes_index ASC
        `, [userId, selectedYear]);

        // 3. RANKING (SÓ ENVIAMOS SE FOR ADMIN OU SE QUISERMOS NO USER TAMBÉM)
        const topSeries = await sql.query(`
            SELECT p.nome, COUNT(v.id)::int as qtd, SUM(v.preco_total)::float as receita
            FROM vendas v
            JOIN produtos p ON v.produto_id = p.id
            WHERE v.user_id = $1
            GROUP BY p.nome
            ORDER BY qtd DESC
            LIMIT 5
        `, [userId]);

        return NextResponse.json({
            user: userStats.rows[0],
            performance: monthlyPerformance.rows,
            ranking: topSeries.rows,
            year: selectedYear
        });

    } catch (error: any) {
        console.error("❌ Erro na API de Stats:", error.message);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}