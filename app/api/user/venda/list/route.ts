import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const { searchParams } = new URL(request.url);
        
        const userId = searchParams.get("user_id");
        const mesStr = searchParams.get("mes");
        const anoStr = searchParams.get("ano");

        if (!session) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        if (!userId || !mesStr || !anoStr) {
            return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
        }

        if (session.user.role !== 'admin' && session.user.id !== userId) {
            return NextResponse.json({ error: "403 - Não autorizado" }, { status: 403 });
        }

        const mes = parseInt(mesStr);
        const ano = parseInt(anoStr);

        const vendas = await prisma.vendas.findMany({
            where: {
                user_id: userId,
                data_venda: {
                    gte: new Date(Date.UTC(ano, mes - 1, 1)),
                    lt: new Date(Date.UTC(ano, mes, 1)),
                }
            },
            include: {
                produtos: true,
                grupos: {
                    select: { nome: true }
                }
            },
            orderBy: [
                { data_venda: 'desc' },
                { created_at: 'desc' }
            ]
        });

        const vendasFormatadas = vendas.map(v => ({
            id: v.id,
            capitulo: Number(v.capitulo), // Agora usando o nome real do campo no banco
            preco_total: v.preco_total,
            data_venda: v.data_venda,
            lock_user: v.lock_user,
            lock_admin: v.lock_admin,
            plataforma: v.produtos.plataforma, 
            
            produto: {
                id: v.produto_id,
                nome: v.produtos.nome,
                nome_alternativo: v.produtos.nome_alternativo,
                imagem_url: v.produtos.imagem_url,
                plataforma: v.produtos.plataforma 
            },
            
            grupo: {
                nome: v.grupos?.nome || "Sem Grupo"
            }
        }));

        return NextResponse.json(vendasFormatadas);

    } catch (error: any) {
        console.error("❌ Erro ao listar vendas detalhadas:", error.message);
        return NextResponse.json({ 
            error: "Erro interno ao buscar extrato",
            details: error.message 
        }, { status: 500 });
    }
}