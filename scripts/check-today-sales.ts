import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const vendas = await prisma.vendas.findMany({
    where: {
      created_at: {
        gte: today
      }
    },
    include: {
      produtos: true,
      grupos: true
    },
    orderBy: { created_at: 'desc' }
  })

  console.log(`Sales registered today (${today.toDateString()}): ${vendas.length}`)
  vendas.forEach(v => {
    console.log(`- ID: ${v.id}, User: ${v.user_id}, Produto: ${v.produtos?.nome}, Grupo: ${v.grupos?.nome}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
