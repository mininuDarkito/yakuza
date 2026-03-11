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

  // --- RELATÓRIO DE VENDAS ---
  if (type === "vendas") {
    let resVendas

    const queryBase = `
      SELECT v.id, to_char(v.data_venda, 'DD/MM/YYYY') as data,
             p.nome as produto, g.nome as grupo, v.quantidade,
             v.preco_unitario, v.preco_total, v.cliente_nome,
             v.cliente_contato, v.observacoes
      FROM vendas v
      JOIN produtos p ON v.produto_id = p.id
      JOIN grupos g ON v.grupo_id = g.id
    `

    if (grupoId && startDate && endDate) {
      resVendas = await sql.query(`${queryBase} 
        WHERE v.user_id = $1 AND v.grupo_id = $2 AND v.data_venda >= $3 AND v.data_venda <= $4
        ORDER BY v.data_venda DESC`, [userId, grupoId, startDate, endDate])
    } else if (grupoId) {
      resVendas = await sql.query(`${queryBase} 
        WHERE v.user_id = $1 AND v.grupo_id = $2
        ORDER BY v.data_venda DESC`, [userId, grupoId])
    } else if (startDate && endDate) {
      resVendas = await sql.query(`${queryBase} 
        WHERE v.user_id = $1 AND v.data_venda >= $2 AND v.data_venda <= $3
        ORDER BY v.data_venda DESC`, [userId, startDate, endDate])
    } else {
      resVendas = await sql.query(`${queryBase} 
        WHERE v.user_id = $1 ORDER BY v.data_venda DESC`, [userId])
    }

    const vendas = resVendas.rows

    const headers = ["Data", "Produto", "Grupo", "Quantidade", "Preço Unitário", "Total", "Cliente", "Contato", "Observações"]
    const rows = vendas.map((v) => [
      v.data, v.produto, v.grupo, v.quantidade,
      formatCurrency(Number(v.preco_unitario)),
      formatCurrency(Number(v.preco_total)),
      v.cliente_nome || "", v.cliente_contato || "", v.observacoes || ""
    ])

    const csv = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'export', 'vendas', $2)
    `, [userId, JSON.stringify({ count: vendas.length })])

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vendas-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  }

  // --- RELATÓRIO DE PRODUTOS ---
  if (type === "produtos") {
    const resProd = await sql.query(`
      SELECT p.nome as produto, p.descricao, p.preco, g.nome as grupo,
             CASE WHEN p.ativo THEN 'Sim' ELSE 'Não' END as ativo,
             to_char(p.created_at, 'DD/MM/YYYY') as criado_em
      FROM produtos p
      JOIN grupos g ON p.grupo_id = g.id
      WHERE g.user_id = $1
      ORDER BY g.nome, p.nome
    `, [userId])

    const produtos = resProd.rows
    const headers = ["Produto", "Descrição", "Preço", "Grupo", "Ativo", "Criado em"]
    const rows = produtos.map((p) => [
      p.produto, p.descricao || "", formatCurrency(Number(p.preco)), p.grupo, p.ativo, p.criado_em
    ])

    const csv = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="produtos-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  }

  // --- RELATÓRIO DE GRUPOS ---
  if (type === "grupos") {
    const resGrupos = await sql.query(`
      SELECT g.nome as grupo, g.descricao,
             (SELECT COUNT(*) FROM produtos p WHERE p.grupo_id = g.id) as produtos,
             (SELECT COALESCE(SUM(v.preco_total), 0) FROM vendas v WHERE v.grupo_id = g.id) as total_vendas,
             to_char(g.created_at, 'DD/MM/YYYY') as criado_em
      FROM grupos g
      WHERE g.user_id = $1
      ORDER BY g.nome
    `, [userId])

    const grupos = resGrupos.rows
    const headers = ["Grupo", "Descrição", "Produtos", "Total Vendas", "Criado em"]
    const rows = grupos.map((g) => [
      g.grupo, g.descricao || "", g.produtos, formatCurrency(Number(g.total_vendas)), g.criado_em
    ])

    const csv = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="grupos-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
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