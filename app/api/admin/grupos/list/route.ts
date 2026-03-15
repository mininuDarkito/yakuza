import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        // 1. Verificação de Sessão e Role
        const session = await getServerSession(authOptions);

        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json(
                { error: "Acesso não autorizado. Apenas administradores podem listar grupos." }, 
                { status: 403 }
            );
        }

        // 2. Consulta ao Banco de Dados
        // Buscamos apenas o ID e o Nome, ordenados alfabeticamente
        const res = await sql.query(`
            SELECT id, nome 
            FROM grupos 
            ORDER BY nome ASC
        `);

        // 3. Retorno dos Dados
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