import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

/**
 * PUT /api/admin/grupos/[id]/pagamento
 * Atualiza o status de pagamento de um grupo para um mês específico
 * Body: { statusPagamento: boolean, mes: "2026-03" }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { statusPagamento, mes } = await req.json()
    const { id: grupoId } = await params

    if (typeof statusPagamento !== "boolean") {
      return NextResponse.json(
        { error: "statusPagamento deve ser boolean" },
        { status: 400 }
      )
    }

    if (!mes || typeof mes !== "string") {
      return NextResponse.json(
        { error: "mes é obrigatório no formato 2026-03" },
        { status: 400 }
      )
    }

    // Usar upsert (INSERT ... ON CONFLICT) para atualizar ou criar registro mensal
    const result = await sql.query(
      `
      INSERT INTO grupo_monthly_payment (grupo_id, month_year, payment_status, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (grupo_id, month_year)
      DO UPDATE SET payment_status = $3, updated_at = NOW()
      RETURNING *
    `,
      [grupoId, mes, statusPagamento]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Erro ao atualizar status de pagamento" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      grupo: result.rows[0],
    })
  } catch (error) {
    console.error("Erro ao atualizar pagamento do grupo:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar pagamento", details: String(error) },
      { status: 500 }
    )
  }
}
