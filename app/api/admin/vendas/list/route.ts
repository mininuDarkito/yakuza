import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    
    // 1. Verificação de Segurança
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const produtoId = searchParams.get("produto_id");
    
    // PEGANDO OS PARÂMETROS QUE A API ESTAVA IGNORANDO:
    const mesParam = searchParams.get("mes");
    const anoParam = searchParams.get("ano");

    if (!userId) {
        return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

    try {
        const values: any[] = [userId];
        
        // Iniciamos a query base
        let query = `
            SELECT 
                v.id,
                v.quantidade,
                v.preco_unitario,
                v.preco_total,
                v.data_venda,
                v.observacoes,
                v.capitulos_detalhes,
                v.grupo_id,
                v.produto_id,
                p.nome as produto_nome,
                g.nome as grupo_nome
            FROM vendas v
            INNER JOIN produtos p ON v.produto_id = p.id
            LEFT JOIN grupos g ON v.grupo_id = g.id
            WHERE v.user_id = $1
        `;

        // Filtro por Produto
        if (produtoId && produtoId !== "null") {
            values.push(produtoId);
            query += ` AND v.produto_id = $${values.length}`;
        }

        // --- O FILTRO DE MÊS/ANO QUE FALTAVA ---
        if (mesParam && anoParam && mesParam !== "all" && mesParam !== "undefined") {
            const m = parseInt(mesParam);
            const y = parseInt(anoParam);

            if (!isNaN(m) && !isNaN(y)) {
                // Criamos o intervalo de data pura para evitar erro de fuso horário (Timestamptz)
                const dataInicio = `${y}-${String(m).padStart(2, '0')}-01`;
                const dataFim = m === 12 
                    ? `${y + 1}-01-01` 
                    : `${y}-${String(m + 1).padStart(2, '0')}-01`;

                values.push(dataInicio);
                const pStart = values.length;
                
                values.push(dataFim);
                const pEnd = values.length;

                // Forçamos o banco a filtrar apenas o período selecionado
                query += ` AND v.data_venda::date >= $${pStart}::date AND v.data_venda::date < $${pEnd}::date`;
                
                console.log(`🔎 FILTRANDO NO BANCO: ${dataInicio} até ${dataFim}`);
            }
        }

        query += ` ORDER BY v.data_venda DESC, v.created_at DESC LIMIT 200`;

        const res = await sql.query(query, values);

        return NextResponse.json(res.rows);
    } catch (error: any) {
        console.error("❌ Erro ao listar vendas:", error.message);
        return NextResponse.json({ 
            error: "Falha ao buscar registros", 
            details: error.message 
        }, { status: 500 });
    }
}