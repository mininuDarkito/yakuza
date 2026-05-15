import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const noGroupSales = await prisma.vendas.count({
    where: { grupo_id: null }
  })
  console.log(`Sales without Group: ${noGroupSales}`)

  const totalVendas = await prisma.vendas.count()
  console.log(`Total Sales: ${totalVendas}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
