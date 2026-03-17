import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        // 1. Validação de Segurança
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Proibido" }, { status: 403 });
        }

        // 2. Query com Aspas Duplas (Prevenção de erro de relação no Postgres)
        // Usamos "users" entre aspas para garantir que o Postgres encontre a tabela exata do @@map
        const res = await sql.query(`
            SELECT "id", "discord_username" FROM "users" 
            WHERE "role" = 'user' 
            ORDER BY "id" ASC
        `);

        return NextResponse.json(res.rows);
    } catch (e: any) {
        // Log detalhado no console do terminal para você ver o culpado real
        console.error("❌ Erro na Query de Usuários:", e.message);

        return NextResponse.json({ 
            error: "Erro ao buscar usuários", 
            details: e.message 
        }, { status: 500 });
    }
}