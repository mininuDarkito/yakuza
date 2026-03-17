import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const produtoId = searchParams.get("produto_id");
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");

    const isAdmin = session.user?.role === 'admin';
    const isOwner = session.user?.id === userId;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    try {
        const values: any[] = [userId];
        let query = `
            SELECT 
                v.id, v.quantidade, v.preco_unitario, v.preco_total, v.data_venda,
                v.grupo_id, v.produto_id, v.lock_user, v.lock_admin,
                p.nome as produto_nome, g.nome as grupo_nome
            FROM vendas v
            INNER JOIN produtos p ON v.produto_id = p.id
            LEFT JOIN grupos g ON v.grupo_id = g.id
            WHERE v.user_id = $1
        `;

        if (produtoId && produtoId !== "null") {
            values.push(produtoId);
            query += ` AND v.produto_id = $${values.length}`;
        }

        if (mes && ano && mes !== "undefined") {
            values.push(parseInt(mes), parseInt(ano));
            query += ` AND EXTRACT(MONTH FROM v.data_venda) = $${values.length - 1} 
                       AND EXTRACT(YEAR FROM v.data_venda) = $${values.length}`;
        }

        query += ` ORDER BY v.data_venda DESC LIMIT 100`;

        const res = await sql.query(query, values);
        return NextResponse.json(res.rows);
    } catch (error: any) {
        return NextResponse.json({ error: "Erro interno na listagem" }, { status: 500 });
    }
}