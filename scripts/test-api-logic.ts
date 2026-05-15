import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = '721e62ec-b1f5-4119-a970-01e0d7636c4b'
  const mes = 4 // April
  const ano = 2026

  const gte = new Date(ano, mes - 1, 1)
  const lt = new Date(ano, mes, 1)

  console.log(`Searching for User ${userId} between ${gte.toISOString()} and ${lt.toISOString()}`)

  const vendas = await prisma.vendas.findMany({
    where: {
      user_id: userId,
      data_venda: {
        gte: gte,
        lt: lt,
      }
    },
    include: {
      produtos: true,
      grupos: {
        select: { nome: true }
      }
    },
    orderBy: [
      { data_venda: 'desc' },
      { created_at: 'desc' }
    ]
  });

  console.log(`Found ${vendas.length} sales in April.`)
  vendas.slice(0, 5).forEach(v => {
    console.log(`- ID: ${v.id}, Produto: ${v.produtos?.nome}, Grupo: ${v.grupos?.nome}`)
  })
  
  const mes5 = 5 // May
  const gte5 = new Date(ano, mes5 - 1, 1)
  const lt5 = new Date(ano, mes5, 1)
  const vendas5 = await prisma.vendas.findMany({
    where: {
      user_id: userId,
      data_venda: {
        gte: gte5,
        lt: lt5,
      }
    }
  })
  console.log(`Found ${vendas5.length} sales in May.`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
