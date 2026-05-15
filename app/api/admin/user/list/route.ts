import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Proibido" }, { status: 403 });
        }

        const users = await prisma.users.findMany({
            where: { 
                role: { in: ['user', 'admin'] } 
            },
            select: { id: true, discord_username: true },
            orderBy: { id: 'asc' }
        });

        return NextResponse.json(users);
    } catch (e: any) {
        console.error("❌ Erro na Query de Usuários:", e.message);
        return NextResponse.json({ 
            error: "Erro ao buscar usuários", 
            details: e.message 
        }, { status: 500 });
    }
}