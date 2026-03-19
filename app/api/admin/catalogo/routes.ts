import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "403" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
        return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

    try {
        const res = await sql.query(`
            SELECT 
                p.id as produto_id,
                p.nome,
                p.imagem_url as capa_url, 
                COUNT(v.id)::int as total_caps_vendidos,
                COUNT(v.id)::int as total_registros,
                COALESCE(SUM(v.preco_total::numeric), 0)::float as faturamento_serie
            FROM produtos p
            INNER JOIN vendas v ON p.id = v.produto_id
            WHERE v.user_id = $1
            -- O GROUP BY deve usar o nome REAL da coluna do banco (imagem_url)
            GROUP BY p.id, p.nome, p.imagem_url
            ORDER BY p.nome ASC
        `, [userId]);

        return NextResponse.json(res.rows);
    } catch (error: any) {
        console.error("❌ Erro SQL no Catálogo:", error.message);
        return NextResponse.json({ 
            error: "Erro ao processar dados do catálogo",
            details: error.message 
        }, { status: 500 });
    }
}