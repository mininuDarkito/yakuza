import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // SEGURANÇA HÍBRIDA:
        const isAdmin = session.user?.role === 'admin';
        const isOwner = session.user?.id === userId;

        // Se não for admin e tentar ver grupos de outro, ou se não houver ID e não for admin
        if (!isAdmin && (!userId || !isOwner)) {
            return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
        }

        let query = "";
        let values: any[] = [];

        if (userId && userId !== "undefined" && userId !== "null") {
            query = `
                SELECT id, nome, user_id
                FROM grupos
                WHERE user_id = $1
                ORDER BY nome ASC
            `;
            values = [userId];
        } else {
            // Apenas Admin chega aqui (listagem global de grupos)
            query = `SELECT id, nome, user_id FROM grupos ORDER BY nome ASC`;
        }

        const res = await sql.query(query, values);
        return NextResponse.json(res.rows);

    } catch (error: any) {
        console.error("❌ Erro ao listar grupos:", error.message);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}