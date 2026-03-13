import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const grupoId = searchParams.get("grupo_id")
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  const type = searchParams.get("type") || "vendas"

  try {
    // --- RELATÓRIO DE VENDAS ---
    if (type === "vendas") {
      let resVendas

      const queryBase = `
        SELECT v.id, to_char(v.data_venda, 'DD/MM/YYYY') as data,
               p.nome as produto, g.nome as grupo, v.quantidade,
               v.preco_unitario, v.preco_total, p.plataforma, v.observacoes
        FROM vendas v
        JOIN produtos p ON v.produto_id = p.id
        LEFT JOIN grupos g ON v.grupo_id = g.id
      `

      // Correção nos ORDER BY: Removido o "= $1" ou "- $1" que causava erro de sintaxe
      if (grupoId && grupoId !== 'all' && startDate && endDate) {
        resVendas = await sql.query(`${queryBase} 
    WHERE v.user_id = $1 
    AND v.grupo_id = $2 
    AND v.data_venda::date >= $3::date 
    AND v.data_venda::date <= $4::date
    ORDER BY v.data_venda DESC`, [userId, grupoId, startDate, endDate])
      } else if (grupoId && grupoId !== 'all') {
        resVendas = await sql.query(`${queryBase} 
    WHERE v.user_id = $1 AND v.grupo_id = $2
    ORDER BY v.data_venda DESC`, [userId, grupoId])
      } else if (startDate && endDate) {
        resVendas = await sql.query(`${queryBase} 
    WHERE v.user_id = $1 
    AND v.data_venda::date >= $2::date 
    AND v.data_venda::date <= $3::date
    ORDER BY v.data_venda DESC`, [userId, startDate, endDate])
      } else {
        resVendas = await sql.query(`${queryBase} 
    WHERE v.user_id = $1 
    ORDER BY v.data_venda DESC`, [userId])
      }

      const vendas = resVendas.rows
      const headers = ["Data", "Série", "Grupo", "Capítulo", "Preço Unitário", "Total", "Plataforma", "Observações"]

      const rows = vendas.map((v) => [
        v.data,
        v.produto,
        v.grupo || "Sem Grupo",
        v.quantidade,
        formatCurrency(Number(v.preco_unitario)),
        formatCurrency(Number(v.preco_total)),
        v.plataforma || "",
        v.observacoes || ""
      ])

      const csvContent = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

      return new NextResponse("\ufeff" + csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="vendas-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    // --- RELATÓRIO DE PRODUTOS ---
    if (type === "produtos") {
      const resProd = await sql.query(`
        SELECT p.nome, p.descricao, p.plataforma, p.link_serie,
               to_char(p.created_at, 'DD/MM/YYYY') as criado_em
        FROM produtos p
        ORDER BY p.nome
      `)

      const produtos = resProd.rows
      const headers = ["Produto", "Descrição", "Plataforma", "Link", "Criado em"]
      const rows = produtos.map((p) => [
        p.nome, p.descricao || "", p.plataforma || "", p.link_serie || "", p.criado_em
      ])

      const csvContent = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

      return new NextResponse("\ufeff" + csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="produtos-catalogo.csv"`,
        },
      })
    }

    // --- RELATÓRIO DE GRUPOS ---
    if (type === "grupos") {
      const resGrupos = await sql.query(`
        SELECT g.nome, g.descricao,
               (SELECT COUNT(*) FROM vendas v WHERE v.grupo_id = g.id) as total_vendas_count,
               to_char(g.created_at, 'DD/MM/YYYY') as criado_em
        FROM grupos g
        WHERE g.user_id = $1
        ORDER BY g.nome
      `, [userId])

      const grupos = resGrupos.rows
      const headers = ["Grupo", "Descrição", "Total de Vendas", "Criado em"]
      const rows = grupos.map((g) => [
        g.nome, g.descricao || "", g.total_vendas_count, g.criado_em
      ])

      const csvContent = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

      return new NextResponse("\ufeff" + csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="grupos.csv"`,
        },
      })
    }

  } catch (error: any) {
    console.error("❌ Erro na Exportação:", error.message)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }

  return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? "")
  if (str.includes(";") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}