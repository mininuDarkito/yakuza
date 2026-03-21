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
        
        // --- LOGICA DE PAGINAÇÃO FLEXÍVEL ---
        const page = parseInt(searchParams.get('page') || '1');
        
        // Se o componente enviar um limit, usamos ele. Se não, o padrão é 18 (para não quebrar o outro componente)
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 18; 
        
        const offset = (page - 1) * limit;

        // Query base com COUNT(*) OVER() para metadados
        let query = `
            SELECT 
                p.id, p.nome, p.imagem_url, p.plataforma, p.nome_alternativo, 
                p.descricao, p.link_serie,
                COUNT(*) OVER() as total_count
            FROM produtos p
            WHERE p.id NOT IN (
                SELECT produto_id FROM user_series WHERE user_id = $1
            )
            AND (p.nome ILIKE $2 OR p.nome_alternativo ILIKE $2)
        `;

        const queryValues: any[] = [userId, `%${search}%`];
        let paramIndex = 3;

        // Filtro de plataforma
        if (plataforma && plataforma !== "TODAS") {
            query += ` AND p.plataforma = $${paramIndex}`;
            queryValues.push(plataforma);
            paramIndex++;
        }

        // Ordenação por nome
        query += ` ORDER BY p.nome ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryValues.push(limit, offset);
        
        const res = await sql.query(query, queryValues);

        // O total de itens vem na coluna total_count de qualquer linha
        const totalItems = res.rows.length > 0 ? parseInt(res.rows[0].total_count) : 0;

        return NextResponse.json({
            items: res.rows,
            total: totalItems,
            page,
            limit, // Retornamos o limite usado para conferência
            totalPages: Math.ceil(totalItems / limit)
        });

    } catch (error: any) {
        console.error("❌ Erro ao carregar catálogo:", error.message);
        return NextResponse.json({ error: "Erro ao carregar catálogo explorável" }, { status: 500 });
    }
}