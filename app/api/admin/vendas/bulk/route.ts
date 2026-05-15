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
        const { ids, data } = body; // ids: string[], data: { user_id?, grupo_id?, preco_unitario? }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "IDs não fornecidos" }, { status: 400 });
        }

        const updateData: any = {
            updated_at: new Date()
        };

        if (data.user_id) updateData.user_id = data.user_id;
        if (data.grupo_id !== undefined) updateData.grupo_id = data.grupo_id || null;
        if (data.preco_unitario !== undefined) {
            updateData.preco_unitario = data.preco_unitario;
            updateData.preco_total = Number(data.preco_unitario);
        }

        await prisma.vendas.updateMany({
            where: {
                id: { in: ids },
                lock_admin: false // Segurança: não altera o que está selado
            },
            data: updateData
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error: any) {
        console.error("❌ Erro no bulk update vendas:", error.message);

        if (error.code === 'P2002') {
            return NextResponse.json({ 
                error: "Alguns dos registros selecionados resultariam em duplicidade (mesmo capítulo para o mesmo vendedor no mesmo grupo)." 
            }, { status: 400 });
        }

        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const ids = searchParams.get("ids")?.split(",");

        if (!ids || ids.length === 0) {
            return NextResponse.json({ error: "IDs não fornecidos" }, { status: 400 });
        }

        await prisma.vendas.deleteMany({
            where: {
                id: { in: ids },
                lock_admin: false
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ Erro no bulk delete vendas:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
