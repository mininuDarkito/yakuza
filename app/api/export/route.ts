import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

function formatCurrency(value: any): string {
  if (value === null || value === undefined) return "0,00";
  return Number(value).toFixed(2).replace(".", ",");
}

function escapeCSV(value: unknown): string {
    const str = String(value ?? "")
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

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
    if (type === "vendas") {
      const where: any = { user_id: userId };
      
      if (grupoId && grupoId !== 'all') {
        where.grupo_id = grupoId;
      }
      
      if (startDate && endDate) {
        where.data_venda = {
            gte: new Date(startDate),
            lte: new Date(endDate)
        };
      }

      const vendas = await prisma.vendas.findMany({
          where,
          include: {
              produtos: { select: { nome: true, plataforma: true } },
              grupos: { select: { nome: true } }
          },
          orderBy: { data_venda: 'desc' }
      });

      const headers = ["Data", "Série", "Grupo", "Capítulo", "Preço Unitário", "Total", "Plataforma", "Observações"]
      const rows = vendas.map((v) => [
        v.data_venda ? v.data_venda.toLocaleDateString('pt-BR') : "",
        v.produtos.nome,
        v.grupos?.nome || "Sem Grupo",
        v.capitulo,
        formatCurrency(v.preco_unitario),
        formatCurrency(v.preco_total),
        v.produtos.plataforma || "",
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

    if (type === "produtos") {
      const produtos = await prisma.produtos.findMany({
          orderBy: { nome: 'asc' }
      });

      const headers = ["Produto", "Descrição", "Plataforma", "Link", "Criado em"]
      const rows = produtos.map((p) => [
        p.nome, 
        p.descricao || "", 
        p.plataforma || "", 
        p.link_serie || "", 
        p.created_at ? p.created_at.toLocaleDateString('pt-BR') : ""
      ])

      const csvContent = [headers.join(";"), ...rows.map((r) => r.map(escapeCSV).join(";"))].join("\n")

      return new NextResponse("\ufeff" + csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="produtos-catalogo.csv"`,
        },
      })
    }

    if (type === "grupos") {
      const grupos = await prisma.grupos.findMany({
          where: { user_id: userId },
          include: {
              _count: {
                  select: { vendas: true }
              }
          },
          orderBy: { nome: 'asc' }
      });

      const headers = ["Grupo", "Descrição", "Total de Vendas", "Criado em"]
      const rows = grupos.map((g) => [
        g.nome, 
        g.descricao || "", 
        g._count.vendas, 
        g.created_at ? g.created_at.toLocaleDateString('pt-BR') : ""
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