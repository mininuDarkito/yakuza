import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    try {
        // 1. Verificação de Sessão e Role
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: "Acesso não autorizado." }, 
                { status: 403 }
            );
        }

        let query = "";
        let values: any[] = [];

        if (userId && userId !== "undefined") {
            // Ajustado para usar a coluna user_id que existe no seu Model Grupo do Prisma
            query = `
                SELECT id, nome
                FROM grupos
                WHERE user_id = $1
                ORDER BY nome ASC
            `;
            values = [userId];
        } else {
            // Se não passar userId, lista todos os grupos do sistema
            query = `SELECT id, nome FROM grupos ORDER BY nome ASC`;
        }

        const res = await sql.query(query, values);
        return NextResponse.json(res.rows);

    } catch (error: any) {
        console.error("❌ Erro ao listar grupos:", error.message);
        
        return NextResponse.json(
            { 
                error: "Falha interna ao buscar grupos", 
                details: error.message 
            }, 
            { status: 500 }
        );
    }
}