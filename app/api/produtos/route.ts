import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { uploadImage } from "@/lib/storage"
import { prisma } from "@/lib/db"
import { z } from "zod"

const produtoSchema = z.object({
  id: z.string().uuid().optional().nullable(), 
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  preco: z.number().nonnegative("Preço não pode ser negativo"),
  ativo: z.boolean().default(true),
  grupo_id: z.string().uuid("Selecione um grupo global válido"),
  imagem_url: z.string().optional().nullable(),
  link_serie: z.string().url("URL inválida").optional().nullable(),
  plataforma: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    // Busca todas as obras que têm preço nos grupos onde o usuário é membro
    const produtosPrecos = await prisma.grupo_series.findMany({
      where: {
        grupos: {
          membros: {
            some: { user_id: userId }
          }
        }
      },
      include: {
        produtos: true,
        grupos: {
          select: { nome: true }
        }
      },
      orderBy: {
        produtos: { nome: 'asc' }
      }
    })

    const formattedProducts = produtosPrecos.map(gp => ({
      id: gp.id, // ID do preco_grupo
      produto_id: gp.produto_id,
      nome: gp.produtos.nome,
      plataforma: gp.produtos.plataforma,
      imagem_url: gp.produtos.imagem_url,
      link_serie: gp.produtos.link_serie,
      descricao: gp.produtos.descricao,
      preco: gp.preco,
      ativo: true,
      grupo_nome: gp.grupos?.nome || "Sem Grupo",
      grupo_id: gp.grupo_id
    }))

    return NextResponse.json(formattedProducts)
  } catch (error) {
    console.error("❌ Erro no GET produtos:", error)
    return NextResponse.json({ error: "Erro ao buscar catálogo" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const precoId = searchParams.get("id");

    if (!precoId) return NextResponse.json({ error: "ID do preço é obrigatório" }, { status: 400 });

    // Somente Admin ou Dono do Grupo pode remover preço de obra no grupo
    const preco = await prisma.grupo_series.findUnique({
      where: { id: precoId },
      include: { grupos: true }
    });

    if (!preco) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });

    if (session.user.role !== 'admin' && preco.grupos.user_id !== userId) {
      return NextResponse.json({ error: "Apenas administradores ou donos de grupo podem remover preços do catálogo." }, { status: 403 });
    }

    await prisma.grupo_series.delete({ where: { id: precoId } });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Erro no DELETE produtos:", error);
    return NextResponse.json({ error: "Erro ao processar remoção" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    
    const cleanPreco = typeof body.preco === 'string' 
        ? parseFloat(body.preco.replace(',', '.')) 
        : body.preco;

    const data = produtoSchema.parse({ ...body, preco: cleanPreco });

    const result = await prisma.$transaction(async (tx) => {
      // Validação de Membro do Grupo
      const isMember = await tx.membros_grupo.findFirst({
        where: { user_id: userId, grupo_id: data.grupo_id }
      });

      if (!isMember && session.user.role !== 'admin') {
        throw new Error("Você não tem permissão para configurar obras neste grupo.");
      }

      // Garantir que a imagem vá para o Cloudinary
      const cloudinaryUrl = await uploadImage(data.imagem_url, data.nome, data.id || undefined);

      // 1. UPSERT Global (Catálogo)
      const produto = await tx.produtos.upsert({
        where: { nome: data.nome.trim() },
        update: {
          descricao: data.descricao || undefined,
          imagem_url: cloudinaryUrl || undefined,
          link_serie: data.link_serie || undefined,
          plataforma: data.plataforma || undefined,
          updated_at: new Date(),
        },
        create: {
          nome: data.nome.trim(),
          descricao: data.descricao || "",
          imagem_url: cloudinaryUrl || "",
          link_serie: data.link_serie || "",
          plataforma: data.plataforma || 'auto',
        }
      });

      // 2. UPSERT do Preço do Grupo (Onde reside o controle real agora)
      const precoGrupo = await tx.grupo_series.upsert({
        where: {
          grupo_id_produto_id: {
            grupo_id: data.grupo_id,
            produto_id: produto.id
          }
        },
        update: {
          preco: data.preco,
          updated_at: new Date(),
        },
        create: {
          grupo_id: data.grupo_id,
          produto_id: produto.id,
          preco: data.preco,
        }
      });

      return precoGrupo;
    });

    return NextResponse.json({ success: true, item: result }, { status: 201 })

  } catch (error: any) {
    console.error("❌ Erro no POST produtos:", error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: "Falha ao sincronizar obra" }, { status: 500 })
  }
}