import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    
    // Bloqueio de segurança
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "ID da venda é obrigatório" }, { status: 400 });
    }

    try {
        // Deleta a venda do banco de dados
        const result = await sql.query(`
            DELETE FROM vendas 
            WHERE id = $1
            RETURNING id
        `, [id]);

        if (result.rowCount === 0) {
            return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
        }

        return NextResponse.json({ success: true, deletedId: id });
    } catch (error: any) {
        console.error("❌ Erro ao deletar venda:", error.message);
        return NextResponse.json({ 
            error: "Erro interno ao processar exclusão",
            details: error.message 
        }, { status: 500 });
    }
}
