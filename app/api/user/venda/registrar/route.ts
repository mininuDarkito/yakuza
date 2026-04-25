import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { sendVendaLog } from "@/lib/discord-logger";

const registroSchema = z.object({
  obra_id: z.string().uuid(),
  grupo_id: z.string().uuid(),
  capitulos: z.string().min(1),
  preco_unitario: z.number().nonnegative(),
  data_venda: z.string(),
  obs: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const userId = session.user.id;
    const body = await request.json();
    const data = registroSchema.parse(body);

    const parseCapitulos = (input: string): number[] => {
      const nums = new Set<number>();
      const parts = input.split(/[ ,;]+/).filter(p => p.trim() !== "");

      parts.forEach(part => {
        if (part.includes("-")) {
          const [start, end] = part.split("-").map(p => parseFloat(p.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            const min = Math.min(start, end);
            const max = Math.max(start, end);
            for (let i = min; i <= max; i++) nums.add(i);
          }
        } else {
          const n = parseFloat(part.trim());
          if (!isNaN(n)) nums.add(n);
        }
      });
      return Array.from(nums).sort((a, b) => a - b);
    };

    const listaCaps = parseCapitulos(data.capitulos);

    if (listaCaps.length === 0) {
      return NextResponse.json({ error: "Nenhum capítulo válido identificado." }, { status: 400 });
    }

    const dataVendaFinal = new Date(data.data_venda);

    // Registro em massa usando Transação Prisma com Upsert
    const totalRegistrado = await prisma.$transaction(async (tx) => {
      const promises = listaCaps.map(cap => 
        tx.vendas.upsert({
          where: {
            user_id_produto_id_grupo_id_capitulo: {
              user_id: userId,
              produto_id: data.obra_id,
              grupo_id: data.grupo_id,
              capitulo: cap
            }
          },
          update: {
            preco_unitario: data.preco_unitario,
            preco_total: data.preco_unitario,
            observacoes: data.obs || null,
            updated_at: new Date()
          },
          create: {
            user_id: userId,
            produto_id: data.obra_id,
            grupo_id: data.grupo_id,
            capitulo: cap,
            preco_unitario: data.preco_unitario,
            preco_total: data.preco_unitario,
            observacoes: data.obs || null,
            data_venda: dataVendaFinal
          }
        })
      );

      const resultados = await Promise.all(promises);

      await tx.activity_logs.create({
        data: {
          user_id: userId,
          action: 'batch_venda_registro',
          entity_type: 'venda',
          details: { obra_id: data.obra_id, caps: listaCaps, count: resultados.length }
        }
      });

      return resultados.length;
    }, {
        timeout: 30000 // 30 segundos de tolerância para lotes grandes
    });
    
    // Log no Discord
    await sendVendaLog({
      userId: userId,
      produtoId: data.obra_id,
      grupoId: data.grupo_id,
      capitulos: listaCaps,
      precoUnitario: data.preco_unitario
    });

    return NextResponse.json({ 
      success: true, 
      count: totalRegistrado,
      message: `${totalRegistrado} capítulos registrados com sucesso!` 
    });

  } catch (error: any) {
    console.error("❌ [YAKUZA API] Erro no registro:", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Falha interna ao registrar venda." }, { status: 500 });
  }
}