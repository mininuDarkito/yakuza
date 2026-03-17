import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    const isAdmin = session.user?.role === 'admin';
    const isOwner = session.user?.id === userId;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    try {
        const res = await sql.query(`
            SELECT 
                p.id as produto_id,
                p.nome,
                p.imagem_url,
                COUNT(v.id)::int as total_caps_vendidos,
                COALESCE(SUM(v.preco_total), 0)::float as faturamento_serie,
                COUNT(CASE WHEN v.grupo_id IS NULL THEN 1 END)::int as pendencias_vinculo
            FROM vendas v
            JOIN produtos p ON v.produto_id = p.id
            WHERE v.user_id = $1
            GROUP BY p.id, p.nome, p.imagem_url
            ORDER BY pendencias_vinculo DESC, p.nome ASC
        `, [userId]);

        return NextResponse.json(res.rows);
    } catch (error: any) {
        console.error("❌ Erro Catálogo:", error.message);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}