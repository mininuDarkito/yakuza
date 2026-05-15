import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const grupoSchema = z.object({
  nome: z.string().min(1, "O nome do grupo é obrigatório"),
  channel_id: z.string().min(1, "O ID do canal do Discord é obrigatório"),
  descricao: z.string().optional(),
})

// --- GET: BUSCAR DETALHES DO GRUPO GLOBAL ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { id } = await params

  try {
    const grupo = await prisma.grupos.findUnique({
      where: { id }
    });

    if (!grupo) {
      return NextResponse.json({ error: "Grupo global não encontrado" }, { status: 404 })
    }

    return NextResponse.json(grupo)
  } catch (error) {
    console.error("Erro ao buscar grupo:", error);
    return NextResponse.json({ error: "Erro ao buscar grupo" }, { status: 500 })
  }
}

// --- PUT: ATUALIZAR CONFIGURAÇÃO DO GRUPO (ADMIN ONLY) ---
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const data = grupoSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const grupo = await tx.grupos.update({
        where: { id },
        data: {
          nome: data.nome,
          channel_id: data.channel_id,
          descricao: data.descricao || null,
          updated_at: new Date()
        }
      });

      await tx.activity_logs.create({
        data: {
          user_id: session.user.id,
          action: 'update_global_group',
          entity_type: 'grupo',
          entity_id: id,
          details: { nome: data.nome, channel: data.channel_id }
        }
      });

      return grupo;
    });

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("❌ Erro no PUT grupo:", error)
    return NextResponse.json({ error: "Erro interno ao atualizar grupo" }, { status: 500 })
  }
}

// --- DELETE: REMOVER GRUPO GLOBAL (ADMIN ONLY) ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  const { id } = await params

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verifica se existem vendas vinculadas
      const vendasCount = await tx.vendas.count({ where: { grupo_id: id } });

      if (vendasCount > 0) {
        return { error: "Impossível excluir: Este grupo possui histórico de vendas. Desative-o em vez de excluir." };
      }

      // 2. Remove vínculos de séries (user_series)
      await tx.user_series.deleteMany({ where: { grupo_id: id } });

      // 3. Deleta o grupo
      const deleted = await tx.grupos.delete({ where: { id } });

      // 4. Log activity
      await tx.activity_logs.create({
        data: {
          user_id: session.user.id,
          action: 'delete_global_group',
          entity_type: 'grupo',
          entity_id: id
        }
      });

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Erro no DELETE grupo:", error)
    return NextResponse.json({ error: "Erro interno ao excluir grupo" }, { status: 500 })
  }
}