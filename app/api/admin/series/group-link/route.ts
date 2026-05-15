import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

const linkSchema = z.object({
  produto_id: z.string().uuid(),
  grupo_id: z.string().uuid(),
  preco: z.number().nonnegative(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();
    const data = linkSchema.parse(body);

    const linked = await prisma.grupo_series.upsert({
      where: {
        grupo_id_produto_id: {
          grupo_id: data.grupo_id,
          produto_id: data.produto_id
        }
      },
      update: {
        preco: data.preco,
      },
      create: {
        grupo_id: data.grupo_id,
        produto_id: data.produto_id,
        preco: data.preco
      }
    });

    return NextResponse.json({ success: true, data: linked });

  } catch (error: any) {
    console.error("❌ [GROUP LINK] Erro:", error);
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Falha ao configurar grupo na série." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user?.role !== 'admin') {
          return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }
    
        const { searchParams } = new URL(request.url);
        const produtoId = searchParams.get("produto_id");
        const grupoId = searchParams.get("grupo_id");
    
        if (!produtoId || !grupoId) {
            return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
        }
    
        await prisma.grupo_series.delete({
          where: {
            grupo_id_produto_id: {
              grupo_id: grupoId,
              produto_id: produtoId
            }
          }
        });
    
        return NextResponse.json({ success: true });
    
      } catch (error: any) {
        console.error("❌ [GROUP UNLINK] Erro:", error);
        return NextResponse.json({ error: "Falha ao remover grupo da série." }, { status: 500 });
      }
}
