import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "ID da venda é obrigatório" }, { status: 400 });
    }

    try {
        await prisma.vendas.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error: any) {
        console.error("❌ Erro ao deletar venda:", error.message);
        
        // P2025 é o código do Prisma para 'Record to delete does not exist'
        if (error.code === 'P2025') {
            return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
        }

        return NextResponse.json({ 
            error: "Erro interno ao processar exclusão",
            details: error.message 
        }, { status: 500 });
    }
}
