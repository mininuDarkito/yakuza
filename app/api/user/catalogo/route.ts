import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        
        const search = searchParams.get('search') || '';
        const plataforma = searchParams.get('plataforma');
        const page = parseInt(searchParams.get('page') || '1');
        const limitParam = searchParams.get('limit');
        const limit = limitParam ? parseInt(limitParam) : 18; 
        const offset = (page - 1) * limit;

        // Condições de filtro
        const where: any = {
            AND: [
                {
                    NOT: {
                        user_series: {
                            some: { user_id: userId }
                        }
                    }
                },
                {
                    OR: [
                        { nome: { contains: search, mode: 'insensitive' } },
                        { nome_alternativo: { contains: search, mode: 'insensitive' } }
                    ]
                }
            ]
        };

        if (plataforma && plataforma !== "TODAS") {
            where.AND.push({ plataforma: plataforma });
        }

        // Execução paralela: contagem e busca
        const [totalItems, items] = await Promise.all([
            prisma.produtos.count({ where }),
            prisma.produtos.findMany({
                where,
                orderBy: { nome: 'asc' },
                take: limit,
                skip: offset
            })
        ]);

        return NextResponse.json({
            items,
            total: totalItems,
            page,
            limit,
            totalPages: Math.ceil(totalItems / limit)
        });

    } catch (error: any) {
        console.error("❌ Erro ao carregar catálogo:", error.message);
        return NextResponse.json({ error: "Erro ao carregar catálogo explorável" }, { status: 500 });
    }
}