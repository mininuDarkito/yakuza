import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// --- BUSCAR UMA VENDA ESPECÍFICA (GET) ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const venda = await prisma.vendas.findUnique({
      where: { id, user_id: userId },
      include: {
        produtos: { select: { nome: true } },
        grupos: { select: { nome: true } }
      }
    });

    if (!venda) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
    }

    // Mapeamento para compatibilidade
    const formatted = {
        ...venda,
        quantidade: venda.capitulo,
        produto_nome: venda.produtos.nome,
        grupo_nome: venda.grupos?.nome || "Sem Grupo"
    };

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Erro ao buscar venda:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// --- DELETAR UMA VENDA (DELETE) ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {
        const venda = await tx.vendas.findUnique({
            where: { id, user_id: userId }
        });

        if (!venda) return null;

        await tx.vendas.delete({ where: { id } });

        await tx.activity_logs.create({
            data: {
                user_id: userId,
                action: 'delete_venda',
                entity_type: 'venda',
                entity_id: id
            }
        });

        return true;
    });

    if (!result) {
      return NextResponse.json({ error: "Venda não encontrada ou permissão negada" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Venda removida com sucesso" })
  } catch (error) {
    console.error("Erro ao deletar venda:", error)
    return NextResponse.json({ error: "Erro interno ao deletar" }, { status: 500 })
  }
}