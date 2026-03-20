import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        
        // Parâmetros de busca e filtro
        const search = searchParams.get('search') || '';
        const plataforma = searchParams.get('plataforma');
        
        // Lógica de Paginação (6 colunas * 3 linhas = 18 itens)
        const page = parseInt(searchParams.get('page') || '1');
        const limit = 18;
        const offset = (page - 1) * limit;

        const queryValues: any[] = [userId, `%${search}%`];
        
        // Query com COUNT(*) OVER() para pegar o total sem precisar de outra consulta
        let query = `
            SELECT 
                p.id, p.nome, p.imagem_url, p.plataforma, p.nome_alternativo, 
                p.descricao, p.link_serie,
                COUNT(*) OVER() as total_count
            FROM produtos p
            WHERE p.id NOT IN (
                SELECT produto_id FROM user_series WHERE user_id = $1
            )
            AND p.nome ILIKE $2
        `;

        // Filtro de plataforma
        let paramIndex = 3;
        if (plataforma && plataforma !== "TODAS") {
            query += ` AND p.plataforma = $${paramIndex}`;
            queryValues.push(plataforma);
            paramIndex++;
        }

        // Adiciona Ordenação, Limite e Offset para a paginação
        query += ` ORDER BY p.nome ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryValues.push(limit, offset);
        
        const res = await sql.query(query, queryValues);

        // O total de itens vem em cada linha da coluna total_count (usamos a primeira)
        const totalItems = res.rows.length > 0 ? parseInt(res.rows[0].total_count) : 0;

        return NextResponse.json({
            items: res.rows,
            total: totalItems,
            page,
            totalPages: Math.ceil(totalItems / limit)
        });

    } catch (error: any) {
        console.error("❌ Erro ao carregar catálogo:", error.message);
        return NextResponse.json({ error: "Erro ao carregar catálogo explorável" }, { status: 500 });
    }
}