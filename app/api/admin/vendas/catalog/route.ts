import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    
    // Segurança
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "403" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
        return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    try {
        // Query otimizada para o Catálogo
        const res = await sql.query(`
    SELECT 
        p.id as produto_id,
        p.nome,
        p.imagem_url,
        -- CORREÇÃO 1: Usamos COUNT para não somar os números dos capítulos
        COUNT(v.id)::int as total_caps_vendidos,
        COUNT(v.id)::int as total_registros,
        -- CORREÇÃO 2: Garantimos que o faturamento some o preco_total
        COALESCE(SUM(v.preco_total), 0)::float as faturamento_serie
    FROM vendas v
    JOIN produtos p ON v.produto_id = p.id
    WHERE v.user_id = $1
    GROUP BY p.id, p.nome, p.imagem_url
    ORDER BY p.nome ASC
`, [userId]);

        return NextResponse.json(res.rows);
    } catch (error: any) {
        console.error("❌ Erro na API de Catálogo:", error.message);
        return NextResponse.json({ error: "Erro interno no catálogo", details: error.message }, { status: 500 });
    }
}