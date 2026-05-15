import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

/**
 * PUT /api/admin/grupos/[id]/vendedor/[vendedor_id]/recebimento
 * Atualiza o status de recebimento de um vendedor em um grupo para um mês específico
 * Body: { statusRecebimento: boolean, mes: "2026-03" }
 */
export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: { id: string; vendedor_id: string }
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { statusRecebimento, mes } = await req.json()
    const { id: grupoId, vendedor_id: vendedorId } = await params

    if (typeof statusRecebimento !== "boolean") {
      return NextResponse.json(
        { error: "statusRecebimento deve ser boolean" },
        { status: 400 }
      )
    }

    if (!mes || typeof mes !== "string") {
      return NextResponse.json(
        { error: "mes é obrigatório no formato 2026-03" },
        { status: 400 }
      )
    }

    // Usar upsert para atualizar ou criar registro mensal de recebimento
    const result = await sql.query(
      `
      INSERT INTO vendor_monthly_status (user_id, grupo_id, month_year, recebimento_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (user_id, grupo_id, month_year)
      DO UPDATE SET recebimento_status = $4, updated_at = NOW()
      RETURNING *
    `,
      [vendedorId, grupoId, mes, statusRecebimento]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Erro ao atualizar status do vendedor" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      vendedorStatus: result.rows[0],
    })
  } catch (error) {
    console.error("Erro ao atualizar recebimento do vendedor:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar recebimento", details: String(error) },
      { status: 500 }
    )
  }
}
