import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

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

    // --- CÉREBRO: PROCESSAMENTO DE CAPÍTULOS ---
    const parseCapitulos = (input: string): number[] => {
      const nums = new Set<number>();
      // Filtra partes vazias para evitar NaN (ex: "1, , 2")
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

    // --- REGISTRO EM MASSA (Mapeado para o seu Prisma Schema) ---
    // quantidade = número do capítulo
    // preco_total = quantidade (1) * preco_unitario
    const query = `
      INSERT INTO vendas (
        user_id, 
        produto_id, 
        grupo_id, 
        quantidade, 
        preco_unitario, 
        preco_total, 
        observacoes, 
        data_venda
      )
      SELECT 
        $1, $2, $3, 
        unnest($4::numeric[]), 
        $5, $5, 
        $6, $7::timestamptz
      ON CONFLICT (user_id, produto_id, grupo_id, quantidade) 
      DO UPDATE SET 
        preco_unitario = EXCLUDED.preco_unitario,
        preco_total = EXCLUDED.preco_total,
        observacoes = EXCLUDED.observacoes,
        updated_at = NOW()
      RETURNING id
    `;

    // Garantimos que o preço seja passado com precisão e a data formatada
    const res = await sql.query(query, [
      userId, 
      data.obra_id, 
      data.grupo_id, 
      listaCaps, 
      data.preco_unitario, 
      data.obs || null,
      new Date(data.data_venda).toISOString() // Força formato ISO estável
    ]);

    // Log de Auditoria para o Admin
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'batch_venda_registro', 'venda', $2)
    `, [userId, JSON.stringify({ obra_id: data.obra_id, caps: listaCaps, count: res.rowCount })]);

    return NextResponse.json({ 
      success: true, 
      count: res.rowCount,
      message: `${res.rowCount} capítulos registrados com sucesso!` 
    });

  } catch (error: any) {
    console.error("❌ [YAKUZA API] Erro no registro:", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    return NextResponse.json({ error: "Falha interna ao registrar venda." }, { status: 500 });
  }
}