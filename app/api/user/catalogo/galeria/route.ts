import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const plataforma = searchParams.get('plataforma');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '30'); // Aumentamos o padrão para preencher a tela
        const offset = (page - 1) * limit;

        const queryValues: any[] = [session.user.id, `%${search}%`];
        
        let query = `
            SELECT p.*, COUNT(*) OVER() as total_count
            FROM produtos p
            WHERE p.id NOT IN (
                SELECT gs.produto_id 
                FROM grupo_series gs 
                INNER JOIN membros_grupo mg ON gs.grupo_id = mg.grupo_id 
                WHERE mg.user_id = $1
            )
            AND (p.nome ILIKE $2 OR p.nome_alternativo ILIKE $2)
        `;

        let paramIndex = 3;
        if (plataforma && plataforma !== "TODAS") {
            query += ` AND p.plataforma = $${paramIndex}`;
            queryValues.push(plataforma);
            paramIndex++;
        }

        query += ` ORDER BY p.nome ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryValues.push(limit, offset);
        
        const res = await sql.query(query, queryValues);
        return NextResponse.json(res.rows);

    } catch (error: any) {
        return NextResponse.json({ error: "Erro na Galeria" }, { status: 500 });
    }
}