import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, preco_unitario, quantidade, data_venda, grupo_id } = body;
        if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

        const preco_total = Number(preco_unitario);

        await sql.query(`
            UPDATE vendas 
            SET preco_unitario = $1, 
                preco_total = $2, 
                data_venda = $3, 
                quantidade = $4,
                grupo_id = $5,
                updated_at = NOW()
            WHERE id = $6
        `, [preco_unitario, preco_total, data_venda, quantidade, grupo_id || null, id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ Erro no PATCH vendas:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: "403" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const produtoId = searchParams.get("produto_id");
    const mesParam = searchParams.get("mes");
    const anoParam = searchParams.get("ano");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!userId) return NextResponse.json({ error: "User ID necessário" }, { status: 400 });

    // --- Dentro do seu GET ---
    try {
        const values: any[] = [userId];

        // 1. Base da query
        let query = `
        SELECT v.*, p.nome as produto_nome, g.nome as grupo_nome
        FROM vendas v
        JOIN produtos p ON v.produto_id = p.id
        LEFT JOIN grupos g ON v.grupo_id = g.id
        WHERE v.user_id = $1
    `;

        // 2. Filtro de Produto
        if (produtoId && produtoId !== "null" && produtoId !== "undefined") {
            values.push(produtoId);
            query += ` AND v.produto_id = $${values.length}`;
        }

        // 3. O FILTRO QUE ESTÁ DANDO PROBLEMA (Reconstruído do zero)
        if (mesParam && anoParam && mesParam !== "all" && mesParam !== "undefined") {
            const m = parseInt(mesParam);
            const y = parseInt(anoParam);

            if (!isNaN(m) && !isNaN(y)) {
                const dataInicio = `${y}-${String(m).padStart(2, '0')}-01`;
                const dataFim = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;

                values.push(dataInicio);
                const p1 = values.length;
                values.push(dataFim);
                const p2 = values.length;

                // Usamos parênteses para garantir que o banco priorize esse filtro de data
                query += ` AND (v.data_venda::date >= $${p1}::date AND v.data_venda::date < $${p2}::date)`;

                console.log(`🚀 EXECUTANDO FILTRO RIGOROSO: ${dataInicio} até ${dataFim}`);
            }
        }

        // 4. Ordenação
        query += ` ORDER BY v.data_venda DESC, v.quantidade DESC LIMIT ${limit} OFFSET ${offset}`;

        const res = await sql.query(query, values);

        // LOG FINAL PARA VOCÊ CONFERIR NO TERMINAL
        console.log("Qtd registros retornados:", res.rows.length);

        return NextResponse.json(res.rows);
    } catch (error: any) {
        console.error("❌ Erro no GET vendas:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
