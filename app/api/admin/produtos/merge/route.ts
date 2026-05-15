import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: "Não autorizado" }, { status: 403 })

  try {
    const { sourceId, targetName } = await request.json()

    // 1. Localizar as duas séries
    const source = await prisma.produtos.findUnique({ where: { id: sourceId } })
    const target = await prisma.produtos.findUnique({ where: { nome: targetName } })

    if (!source || !target) return NextResponse.json({ error: "Série não encontrada" }, { status: 404 })
    if (source.id === target.id) return NextResponse.json({ error: "São a mesma série" }, { status: 400 })

    const targetId = target.id

    await prisma.$transaction(async (tx) => {
      // 1. Mover Vendas
      await tx.vendas.updateMany({
        where: { produto_id: sourceId },
        data: { produto_id: targetId }
      })

      // 2. Mover Vínculos de Usuários (Upsert para evitar erros de unique)
      const sourceLinks = await tx.user_series.findMany({ where: { produto_id: sourceId } })
      for (const link of sourceLinks) {
        await tx.user_series.upsert({
          where: {
            user_id_produto_id_grupo_id: {
              user_id: link.user_id,
              produto_id: targetId,
              grupo_id: link.grupo_id
            }
          },
          update: { ativo: link.ativo },
          create: {
            user_id: link.user_id,
            produto_id: targetId,
            grupo_id: link.grupo_id,
            ativo: link.ativo,
            created_at: link.created_at
          }
        })
      }
      await tx.user_series.deleteMany({ where: { produto_id: sourceId } })

      // 3. Mover Configurações de Preços (Grupo Series)
      const sourcePrices = await tx.grupo_series.findMany({ where: { produto_id: sourceId } })
      for (const price of sourcePrices) {
        await tx.grupo_series.upsert({
          where: {
            grupo_id_produto_id: {
              grupo_id: price.grupo_id,
              produto_id: targetId
            }
          },
          update: { preco: price.preco },
          create: {
            grupo_id: price.grupo_id,
            produto_id: targetId,
            preco: price.preco,
            created_at: price.created_at
          }
        })
      }
      await tx.grupo_series.deleteMany({ where: { produto_id: sourceId } })

      // 4. Deletar a série antiga (source)
      await tx.produtos.delete({ where: { id: sourceId } })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("❌ Erro ao fundir séries:", error)
    return NextResponse.json({ error: "Erro ao processar a fusão das séries." }, { status: 500 })
  }
}
