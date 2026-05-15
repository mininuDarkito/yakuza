import { NextResponse } from "next/server";
import { sql } from "@/lib/db"// Ajusta para o teu import do banco
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        // Busca apenas nomes de plataformas únicos e que não sejam nulos
        const query = `
            SELECT DISTINCT plataforma 
            FROM produtos 
            WHERE plataforma IS NOT NULL AND plataforma != ''
            ORDER BY plataforma ASC
        `;
        
        const res = await sql.query(query);
        
        // Retorna apenas um array de strings ['Kakao', 'Ridi', 'Naver']
        const plataformas = res.rows.map(row => row.plataforma);
        
        return NextResponse.json(plataformas);
    } catch (error) {
        console.error("Erro ao buscar plataformas:", error);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}