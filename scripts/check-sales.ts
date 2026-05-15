import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const vendas = await prisma.vendas.findMany({
    include: {
      produtos: true,
      grupos: true
    },
    take: 10,
    orderBy: { created_at: 'desc' }
  })

  console.log('Recent Sales:')
  vendas.forEach(v => {
    console.log(`- ID: ${v.id}, Produto: ${v.produtos?.nome}, Grupo: ${v.grupos?.nome}, UserID: ${v.user_id}`)
  })

  const totalVendas = await prisma.vendas.count()
  console.log(`\nTotal Sales: ${totalVendas}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
