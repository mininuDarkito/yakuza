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
    const userSeries = await prisma.user_series.findMany({
      where: { user_id: userId },
      include: {
        produtos: {
          include: {
            grupo_series: true
          }
        },
        grupos: {
          select: { nome: true }
        }
      },
      orderBy: {
        produtos: { nome: 'asc' }
      }
    })

    const formattedProducts = userSeries.map(us => {
      // Busca o preço unificado do grupo para este produto
      const grupoPreco = us.produtos.grupo_series.find(gs => gs.grupo_id === us.grupo_id);
      
      return {
        vinculo_id: us.id,
        produto_id: us.produto_id,
        nome: us.produtos.nome,
        plataforma: us.produtos.plataforma,
        imagem_url: us.produtos.imagem_url,
        link_serie: us.produtos.link_serie,
        descricao: us.produtos.descricao,
        preco: grupoPreco?.preco || 0,
        ativo: us.ativo,
        grupo_nome: us.grupos?.nome || "Sem Grupo",
        grupo_id: us.grupo_id
      }
    })

    return NextResponse.json(formattedProducts)
  } catch (error) {
    console.error("❌ Erro no GET produtos:", error)
    return NextResponse.json({ error: "Erro ao buscar catálogo" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const vinculoId = searchParams.get("id");

    if (!vinculoId) return NextResponse.json({ error: "ID do vínculo é obrigatório" }, { status: 400 });

    // 1. Buscar vínculo para auditoria
    const vinculo = await prisma.user_series.findUnique({
      where: { id: vinculoId },
      select: { user_id: true, produto_id: true }
    });

    if (!vinculo || vinculo.user_id !== userId) {
        return NextResponse.json({ error: "Vínculo não encontrado ou não pertence a você" }, { status: 404 });
    }

    const produtoId = vinculo.produto_id;

    // 2. Transação para remoção e logs
    await prisma.$transaction(async (tx) => {
      await tx.user_series.delete({ where: { id: vinculoId } });

      if (userRole === 'admin') {
        const vendasCount = await tx.vendas.count({ where: { produto_id: produtoId } });
        const linksCount = await tx.user_series.count({ where: { produto_id: produtoId } });

        if (vendasCount === 0 && linksCount === 0) {
          await tx.produtos.delete({ where: { id: produtoId } });
        }
      }

      await tx.activity_logs.create({
        data: {
          user_id: userId,
          action: 'remove_vinculo',
          entity_type: 'user_series',
          entity_id: vinculoId
        }
      });
    });

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
      // Garantir que a imagem vá para o Cloudinary se for Base64/Nova URL
      const cloudinaryUrl = await uploadImage(data.imagem_url);

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

      // 2. UPSERT do Vínculo
      let vinculo;
      if (body.id) {
        vinculo = await tx.user_series.update({
          where: { id: body.id, user_id: userId },
          data: {
            ativo: data.ativo,
            grupo_id: data.grupo_id,
            updated_at: new Date(),
          }
        });
      } else {
        vinculo = await tx.user_series.upsert({
          where: {
            user_id_produto_id_grupo_id: {
              user_id: userId,
              produto_id: produto.id,
              grupo_id: data.grupo_id
            }
          },
          update: {
            ativo: data.ativo,
            updated_at: new Date(),
          },
          create: {
            user_id: userId,
            produto_id: produto.id,
            grupo_id: data.grupo_id,
            ativo: data.ativo,
          }
        });
      }

      // 3. UPSERT do Preço do Grupo (UNIFICAÇÃO)
      await tx.grupo_series.upsert({
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

      return vinculo;
    });

    return NextResponse.json({ success: true, vinculo: result }, { status: 201 })

  } catch (error: any) {
    console.error("❌ Erro no POST produtos:", error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: "Falha ao sincronizar obra" }, { status: 500 })
  }
}