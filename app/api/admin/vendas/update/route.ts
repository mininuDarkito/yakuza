import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, preco_unitario, quantidade, data_venda, grupo_id } = body;
        if (!id) return NextResponse.json({ error: "ID não fornecido" }, { status: 400 });

        const preco_total = Number(preco_unitario);

        await prisma.vendas.update({
            where: { id },
            data: {
                preco_unitario,
                preco_total,
                data_venda: data_venda ? new Date(data_venda) : undefined,
                capitulo: quantidade,
                grupo_id: grupo_id || null,
                updated_at: new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ Erro no PATCH vendas:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: "403" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const produtoId = searchParams.get("produto_id");
    const mesParam = searchParams.get("mes");
    const anoParam = searchParams.get("ano");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    if (!userId) return NextResponse.json({ error: "User ID necessário" }, { status: 400 });

    try {
        const m = parseInt(mesParam || "0");
        const y = parseInt(anoParam || "0");

        const where: any = {
            user_id: userId,
            ...(produtoId && produtoId !== "null" && produtoId !== "undefined" ? { produto_id: produtoId } : {}),
        };

        if (m > 0 && y > 0 && mesParam !== "all" && mesParam !== "undefined") {
            where.data_venda = {
                gte: new Date(y, m - 1, 1),
                lt: new Date(y, m, 1)
            };
        }

        const vendas = await prisma.vendas.findMany({
            where,
            include: {
                produtos: { select: { nome: true } },
                grupos: { select: { nome: true } }
            },
            orderBy: [
                { data_venda: 'desc' },
                { capitulo: 'desc' }
            ],
            take: limit,
            skip: offset
        });

        // Formatação para compatibilidade
        const formatted = vendas.map(v => ({
            ...v,
            quantidade: v.capitulo,
            produto_nome: v.produtos.nome,
            grupo_nome: v.grupos?.nome || "Sem Grupo"
        }));

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error("❌ Erro no GET vendas:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
