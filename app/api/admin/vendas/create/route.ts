import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { user_id, produto_id, preco_unitario, quantidade, data_venda, grupo_id, observacoes } = body;

        if (!user_id || !produto_id) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        const preco_total = Number(preco_unitario);

        // Verificar rapidamente se o capítulo já existe para essa obra, usuário e grupo
        const resExistente = await sql.query(`
            SELECT id FROM vendas 
            WHERE user_id = $1 AND produto_id = $2 AND grupo_id = $3 AND quantidade = $4
        `, [user_id, produto_id, grupo_id || null, quantidade]);

        if (resExistente.rowCount && resExistente.rowCount > 0) {
            return NextResponse.json({ error: "Este capítulo já está registrado para este usuário e grupo." }, { status: 400 });
        }

        const dataVendaFinal = data_venda || new Date().toISOString();

        const res = await sql.query(`
            INSERT INTO vendas (user_id, produto_id, grupo_id, quantidade, preco_unitario, preco_total, data_venda, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            user_id, 
            produto_id, 
            grupo_id || null, 
            quantidade, 
            preco_unitario, 
            preco_total, 
            dataVendaFinal,
            observacoes || null
        ]);

        return NextResponse.json({ success: true, venda: res.rows[0] });
    } catch (error: any) {
        console.error("❌ Erro no CREATE vendas admin:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
