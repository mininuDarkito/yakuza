import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const produtoId = searchParams.get("produto_id");

    if (!produtoId) {
        return NextResponse.json({ error: "Produto ID é obrigatório" }, { status: 400 });
    }

    try {
        const res = await sql.query(`
            SELECT MAX(quantidade) as max_cap 
            FROM vendas 
            WHERE produto_id = $1
        `, [produtoId]);

        const maxCap = res.rows[0]?.max_cap || 0;

        return NextResponse.json({ max_cap: maxCap });
    } catch (error: any) {
        console.error("❌ Erro ao buscar próximo capítulo:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
