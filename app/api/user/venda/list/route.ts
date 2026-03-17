import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("user_id");

        // 1. Validação de Segurança
        if (!session || (session.user.role !== 'admin' && session.user.id !== userId)) {
            return NextResponse.json({ error: "403 - Não autorizado" }, { status: 403 });
        }

        const mes = searchParams.get("mes");
        const ano = searchParams.get("ano");

        if (!mes || !ano || !userId) {
            return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
        }

        // 2. Query SQL (Mantemos a query achatada para performance)
const query = `
            SELECT 
                v.id,
                v.quantidade,
                v.preco_total,
                v.data_venda,
                p.plataforma,        -- Mudado de v. para p. pois está no Schema de Produto
                v.lock_user,
                v.lock_admin,
                p.id as produto_id,
                p.nome as produto_nome,
                p.nome_alternativo as produto_nome_alternativo,
                p.imagem_url as produto_imagem,
                g.nome as grupo_nome
            FROM vendas v
            INNER JOIN produtos p ON v.produto_id = p.id
            LEFT JOIN grupos g ON v.grupo_id = g.id
            WHERE v.user_id = $1
            AND EXTRACT(MONTH FROM v.data_venda) = $2
            AND EXTRACT(YEAR FROM v.data_venda) = $3
            ORDER BY v.data_venda DESC, v.created_at DESC
        `;

        const res = await sql.query(query, [userId, mes, ano]);

        // 3. MAPEAMENTO (Transformando para o formato aninhado da Interface)
        const vendasFormatadas = res.rows.map(row => ({
            id: row.id,
            quantidade: row.quantidade,
            preco_total: row.preco_total,
            data_venda: row.data_venda,
            lock_user: row.lock_user,
            lock_admin: row.lock_admin,
            plataforma: row.plataforma, 
            
            produto: {
                id: row.produto_id,
                nome: row.produto_nome,
                nome_alternativo: row.produto_nome_alternativo,
                imagem_url: row.produto_imagem,
                plataforma: row.plataforma 
            },
            
            grupo: {
                nome: row.grupo_nome || "Sem Grupo"
            }
        }));

        return NextResponse.json(vendasFormatadas);

    } catch (error: any) {
        console.error("❌ Erro ao listar vendas detalhadas:", error.message);
        return NextResponse.json({ 
            error: "Erro interno ao buscar extrato",
            details: error.message 
        }, { status: 500 });
    }
}