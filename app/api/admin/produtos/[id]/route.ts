import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { uploadImage } from "@/lib/storage"
import { NextResponse } from "next/server"

// --- ATUALIZAR PRODUTO (PATCH) ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { nome, nome_alternativo, link_serie, plataforma, imagem_url } = body

    const cloudinaryUrl = await uploadImage(imagem_url, nome);

    const produto = await prisma.produtos.update({
      where: { id },
      data: {
        nome,
        nome_alternativo,
        link_serie,
        plataforma,
        imagem_url: cloudinaryUrl,
        updated_at: new Date()
      }
    });

    return NextResponse.json(produto)
  } catch (error: any) {
    console.error("❌ Erro ao atualizar produto:", error);

    // Erro de duplicidade (Nome único)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: "Este nome já está sendo usado por outra obra no catálogo global." 
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
  }
}

// --- EXCLUIR PRODUTO (DELETE) ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const productInfo = await tx.produtos.findUnique({
        where: { id },
        select: { nome: true }
      });

      if (!productInfo) return null;

      await tx.produtos.delete({ where: { id } });

      await tx.activity_logs.create({
        data: {
          user_id: session.user.id,
          action: 'global_delete',
          entity_type: 'produtos',
          details: { deleted_name: productInfo.nome, product_id: id }
        }
      });

      return productInfo;
    });

    if (!result) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Erro ao deletar produto:", error)
    return NextResponse.json({ error: "Erro ao excluir: Existem dependências no banco" }, { status: 500 })
  }
}