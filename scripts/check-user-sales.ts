import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = '721e62ec-b1f5-4119-a970-01e0d7636c4b'
  const vendas = await prisma.vendas.findMany({
    where: { user_id: userId },
    include: {
      produtos: true,
      grupos: true
    },
    take: 20,
    orderBy: { created_at: 'desc' }
  })

  console.log(`Sales for User ${userId}:`)
  vendas.forEach(v => {
    console.log(`- ID: ${v.id}, Date: ${v.data_venda}, Produto: ${v.produtos?.nome}, Grupo: ${v.grupos?.nome}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
