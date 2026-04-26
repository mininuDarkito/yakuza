import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const produtoId = searchParams.get("produto_id");
    const mes = searchParams.get("mes");
    const ano = searchParams.get("ano");

    if (!userId) return NextResponse.json({ error: "User ID obrigatório" }, { status: 400 });

    const isAdmin = session.user?.role === 'admin';
    const isOwner = session.user?.id === userId;

    if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    try {
        const vendas = await prisma.vendas.findMany({
            where: {
                user_id: userId,
                ...(produtoId && produtoId !== "null" ? { produto_id: produtoId } : {}),
                ...(mes && ano && mes !== "undefined" ? {
                    data_venda: {
                        gte: new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, 1)),
                        lt: new Date(Date.UTC(parseInt(ano), parseInt(mes), 1)),
                    }
                } : {})
            },
            include: {
                produtos: { select: { nome: true } },
                grupos: { select: { nome: true } }
            },
            orderBy: { data_venda: 'desc' },
            take: 100
        });

        // Mapeando para o formato esperado pelo frontend (compatibilidade com 'quantidade' e joins)
        const formattedVendas = vendas.map(v => ({
            ...v,
            quantidade: v.capitulo, // Mantém compatibilidade com o front se ele ainda usar 'quantidade'
            produto_nome: v.produtos.nome,
            grupo_nome: v.grupos?.nome || "Sem Grupo"
        }));

        return NextResponse.json(formattedVendas);
    } catch (error: any) {
        console.error("Erro na listagem admin de vendas:", error);
        return NextResponse.json({ error: "Erro interno na listagem" }, { status: 500 });
    }
}