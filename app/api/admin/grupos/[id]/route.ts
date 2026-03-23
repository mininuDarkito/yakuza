import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/admin/grupos/[id]
 * Retorna um grupo específico com details completos
 * Query params:
 *   - mes: Formato "2026-03" para buscar status de pagamento do mês específico
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: grupoId } = await params
    const mesParam = req.nextUrl.searchParams.get("mes") || ""

    // 1. Buscar o grupo com status de pagamento (mensal se disponível)
    const grupoRes = await sql.query(
      `
      SELECT 
        g.id, 
        g.nome, 
        g.created_at,
        COALESCE(gmp.payment_status::boolean, g.payment_status::boolean, false) as status_pagamento
      FROM grupos g
      LEFT JOIN grupo_monthly_payment gmp ON g.id = gmp.grupo_id AND gmp.month_year = $1
      WHERE g.id = $2
    `,
      [mesParam, grupoId]
    )

    if (grupoRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      )
    }

    const grupo = grupoRes.rows[0]

    // 2. Buscar vendedores (users com vendas neste grupo) com status de recebimento (mensal ou global)
    const vendedoresRes = await sql.query(
      `
      SELECT DISTINCT
        u.id,
        u.discord_username as nome,
        COALESCE(u.email, '') as contato,
        COALESCE((u.billing_setup ->> 'chave_pix'), '') as chave_pix,
        COALESCE((u.billing_setup ->> 'nome_beneficiario'), '') as nome_beneficiario,
        COALESCE(vms.recebimento_status::boolean, vs.recebimento_status::boolean, false) as status_recebimento
      FROM users u
      LEFT JOIN user_series us ON u.id = us.user_id AND us.grupo_id = $1
      LEFT JOIN vendas v ON u.id = v.user_id AND v.grupo_id = $1
      LEFT JOIN vendor_monthly_status vms ON u.id = vms.user_id AND vms.grupo_id = $1 AND vms.month_year = $2
      LEFT JOIN vendor_status vs ON u.id = vs.user_id AND vs.grupo_id = $1
      WHERE us.id IS NOT NULL OR v.id IS NOT NULL
      GROUP BY u.id, u.discord_username, u.email, u.billing_setup, vms.recebimento_status, vs.recebimento_status
      ORDER BY u.discord_username ASC
    `,
      [grupoId, mesParam]
    )

    // 3. Para cada vendedor, buscar produtos e transações
    const vendedoresComProdutos = await Promise.all(
      vendedoresRes.rows.map(async (vendedor) => {
        // Buscar produtos vendidos por este vendedor neste grupo
        const produtosRes = await sql.query(
          `
          SELECT DISTINCT
            p.id,
            p.nome,
            COALESCE(p.nome_alternativo, '') as nome_alternativo,
            COALESCE(p.imagem_url, '') as imagem_url,
            COALESCE(p.plataforma, '') as plataforma
          FROM produtos p
          INNER JOIN vendas v ON p.id = v.produto_id
          WHERE v.user_id = $1 AND v.grupo_id = $2
          ORDER BY p.nome ASC
        `,
          [vendedor.id, grupoId]
        )

        const produtosComTransacoes = await Promise.all(
          produtosRes.rows.map(async (produto) => {
            // Buscar todas as transações (vendas) para este produto-vendedor-grupo
            const transacoesRes = await sql.query(
              `
              SELECT
                v.id,
                v.data_venda as data,
                v.quantidade,
                v.preco_unitario as valor_unitario
              FROM vendas v
              WHERE v.user_id = $1 
                AND v.produto_id = $2 
                AND v.grupo_id = $3
              ORDER BY v.data_venda ASC
            `,
              [vendedor.id, produto.id, grupoId]
            )

            return {
              id: produto.id,
              nome: produto.nome,
              nomeAlternativo: produto.nome_alternativo && produto.nome_alternativo.trim() ? produto.nome_alternativo : undefined,
              imagemUrl: produto.imagem_url && produto.imagem_url.trim() ? produto.imagem_url : undefined,
              plataforma: produto.plataforma && produto.plataforma.trim() ? produto.plataforma : undefined,
              transacoes: transacoesRes.rows.map((t) => ({
                id: t.id,
                data: t.data,
                quantidade: parseInt(t.quantidade) || 0,
                valorUnitario: parseFloat(t.valor_unitario) || 0,
              })),
            }
          })
        )

        return {
          id: vendedor.id,
          nome: vendedor.nome,
          contato: vendedor.contato || vendedor.nome,
          chavePix: vendedor.chave_pix || vendedor.nome_beneficiario || "N/A",
          statusRecebimento: vendedor.status_recebimento,
          produtos: produtosComTransacoes,
        }
      })
    )

    return NextResponse.json({
      success: true,
      grupo: {
        id: grupo.id,
        nome: grupo.nome,
        statusPagamento: grupo.status_pagamento,
        vendedores: vendedoresComProdutos,
        dataCriacao: grupo.created_at,
      },
    })
  } catch (error) {
    console.error("Erro ao buscar grupo:", error)
    return NextResponse.json(
      { error: "Erro ao buscar grupo", details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/grupos/[id]
 * Deleta um grupo (opcional)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: grupoId } = await params

    const result = await sql.query(
      `
      DELETE FROM grupos
      WHERE id = $1
      RETURNING *
    `,
      [grupoId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Grupo deletado com sucesso",
    })
  } catch (error) {
    console.error("Erro ao deletar grupo:", error)
    return NextResponse.json(
      { error: "Erro ao deletar grupo", details: String(error) },
      { status: 500 }
    )
  }
}
