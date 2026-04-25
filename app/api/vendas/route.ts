import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { sendVendaLog } from "@/lib/discord-logger"

const vendaSchema = z.object({
  produto_id: z.string().uuid("Série inválida"),
  grupo_id: z.string().uuid("Grupo inválido"),
  capitulos: z.array(z.number()).min(1, "Informe ao menos um capítulo"),
  preco_unitario: z.number().positive("Preço deve ser positivo"),
  observacoes: z.string().optional(),
  data_venda: z.string().optional(),
})

// --- LISTAGEM DE VENDAS (GET) ---
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mes = searchParams.get("mes")
  const ano = searchParams.get("ano")

  try {
    const vendas = await prisma.vendas.findMany({
      where: {
        user_id: userId,
        ...(mes && ano ? {
          data_venda: {
            gte: new Date(parseInt(ano), parseInt(mes) - 1, 1),
            lt: new Date(parseInt(ano), parseInt(mes), 1),
          }
        } : {})
      },
      include: {
        produtos: {
          select: {
            nome: true,
            imagem_url: true,
            plataforma: true,
          }
        },
        grupos: {
          select: {
            nome: true,
          }
        }
      },
      orderBy: [
        { data_venda: 'desc' },
        { created_at: 'desc' }
      ]
    })

    // Mapeando para o formato esperado pelo frontend (compatibilidade)
    const formattedVendas = vendas.map(v => ({
      ...v,
      produto_nome: v.produtos.nome,
      produto_imagem: v.produtos.imagem_url,
      produto_plataforma: v.produtos.plataforma,
      grupo_nome: v.grupos?.nome || "Sem Grupo"
    }))

    return NextResponse.json(formattedVendas)
  } catch (error) {
    console.error("Erro ao listar vendas:", error)
    return NextResponse.json({ error: "Erro ao buscar vendas" }, { status: 500 })
  }
}

// --- REGISTRO DE VENDAS (POST) ---
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const data = vendaSchema.parse(body)

    // 1. Validar vínculo (User + Produto + Grupo) e buscar preço unificado
    const [vinculo, grupoPreco] = await Promise.all([
      prisma.user_series.findFirst({
        where: {
          produto_id: data.produto_id,
          user_id: userId,
          grupo_id: data.grupo_id,
          ativo: true
        }
      }),
      prisma.grupo_series.findUnique({
        where: {
          grupo_id_produto_id: {
            grupo_id: data.grupo_id,
            produto_id: data.produto_id
          }
        }
      })
    ])

    if (!vinculo) {
      return NextResponse.json({ error: "Vínculo com este grupo não encontrado ou inativo." }, { status: 404 })
    }

    // Priorizamos o preço unificado do grupo
    const precoUnitario = grupoPreco ? Number(grupoPreco.preco) : data.preco_unitario;

    // 2. Verificar capítulos já existentes para evitar duplicatas
    const existentes = await prisma.vendas.findMany({
      where: {
        user_id: userId,
        produto_id: data.produto_id,
        grupo_id: data.grupo_id,
        capitulo: { in: data.capitulos }
      },
      select: { capitulo: true }
    })

    const capsExistentes = existentes.map(e => Number(e.capitulo))
    const capsParaSalvar = data.capitulos.filter(cap => !capsExistentes.includes(cap))

    if (capsParaSalvar.length === 0) {
      return NextResponse.json({ error: "Capítulo(s) já registrado(s) neste grupo." }, { status: 400 })
    }

    const dataVendaFinal = data.data_venda ? new Date(data.data_venda) : new Date()

    // 3. Execução em transação Prisma
    const resultado = await prisma.$transaction(async (tx) => {
      const inserts = capsParaSalvar.map(cap => 
        tx.vendas.create({
          data: {
            user_id: userId,
            produto_id: data.produto_id,
            grupo_id: data.grupo_id,
            capitulo: cap,
            preco_unitario: precoUnitario,
            preco_total: precoUnitario,
            observacoes: data.observacoes || null,
            data_venda: dataVendaFinal,
          }
        })
      )

      const vendasRegistradas = await Promise.all(inserts)

      await tx.activity_logs.create({
        data: {
          user_id: userId,
          action: 'venda_lote',
          entity_type: 'venda',
          entity_id: data.produto_id,
          details: { caps: capsParaSalvar, grupo: data.grupo_id }
        }
      })

      return vendasRegistradas
    })
    
    // Log no Discord
    await sendVendaLog({
      userId: userId,
      produtoId: data.produto_id,
      grupoId: data.grupo_id,
      capitulos: capsParaSalvar,
      precoUnitario: precoUnitario
    })

    return NextResponse.json({ 
      message: `${resultado.length} capítulo(s) registrado(s).`,
      vendas: resultado 
    }, { status: 201 })

  } catch (error: any) {
    console.error("Erro na API de Vendas:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 })
  }
}