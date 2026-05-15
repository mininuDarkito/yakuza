import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  id: z.string().uuid(),
  capitulo: z.number().nonnegative(),
  preco_unitario: z.number().nonnegative(),
  data_venda: z.string(),
  obs: z.string().optional().nullable(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = session.user.id;
    const body = await request.json();
    const data = updateSchema.parse(body);

    // 1. Verificar se a venda pertence ao usuário e não está trancada
    const venda = await prisma.vendas.findUnique({
      where: { id: data.id }
    });

    if (!venda) {
      return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
    }

    if (venda.user_id !== userId) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    if (venda.lock_user || venda.lock_admin) {
      return NextResponse.json({ error: "Este registro está trancado e não pode ser editado." }, { status: 403 });
    }

    // 2. Verificar se a alteração de capítulo gera duplicata
    if (Number(venda.capitulo) !== data.capitulo) {
        const duplicate = await prisma.vendas.findFirst({
            where: {
                user_id: userId,
                produto_id: venda.produto_id,
                grupo_id: venda.grupo_id,
                capitulo: data.capitulo,
                id: { not: data.id }
            }
        });

        if (duplicate) {
            return NextResponse.json({ error: "Já existe um registro para este capítulo nesta obra e grupo." }, { status: 400 });
        }
    }

    // 3. Atualizar
    const updated = await prisma.vendas.update({
      where: { id: data.id },
      data: {
        capitulo: data.capitulo,
        preco_unitario: data.preco_unitario,
        preco_total: data.preco_unitario, // Preço total é igual ao unitário já que é 1 cap por linha
        data_venda: new Date(data.data_venda),
        observacoes: data.obs || null,
        updated_at: new Date()
      }
    });

    return NextResponse.json({ success: true, venda: updated });

  } catch (error: any) {
    console.error("❌ [UPDATE VENDA] Erro:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Falha ao atualizar venda." }, { status: 500 });
  }
}
