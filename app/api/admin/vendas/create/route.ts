import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendVendaLog } from "@/lib/discord-logger";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { user_id, produto_id, preco_unitario, capitulo, data_venda, grupo_id, observacoes } = body;

        if (!user_id || !produto_id) {
            return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
        }

        const preco_total = Number(preco_unitario);
        const dataVendaFinal = data_venda ? new Date(data_venda) : new Date();

        // Usamos upsert ou uma transação para garantir a integridade
        // Mas como o código original verificava e retornava erro, manteremos a lógica
        const existente = await prisma.vendas.findUnique({
            where: {
                user_id_produto_id_grupo_id_capitulo: {
                    user_id: user_id,
                    produto_id: produto_id,
                    grupo_id: grupo_id || null,
                    capitulo: capitulo
                }
            }
        });

        if (existente) {
            return NextResponse.json({ error: "Este capítulo já está registrado para este usuário e grupo." }, { status: 400 });
        }

        const venda = await prisma.vendas.create({
            data: {
                user_id,
                produto_id,
                grupo_id: grupo_id || null,
                capitulo: capitulo,
                preco_unitario,
                preco_total,
                data_venda: dataVendaFinal,
                observacoes: observacoes || null
            }
        });
        
        // Log no Discord
        await sendVendaLog({
            userId: user_id,
            produtoId: produto_id,
            grupoId: grupo_id,
            capitulos: capitulo,
            precoUnitario: preco_unitario,
            dataVenda: data_venda
        });

        return NextResponse.json({ success: true, venda });
    } catch (error: any) {
        console.error("❌ Erro no CREATE vendas admin:", error.message);
        return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
    }
}
