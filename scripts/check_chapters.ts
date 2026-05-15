import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const chapters = await prisma.mecha_chapters.findMany({
    where: {
      series: {
        title: {
          contains: '禁忌'
        }
      }
    },
    include: { series: true }
  })
  
  console.log(`Found ${chapters.length} chapters.`)
  for (const c of chapters) {
    const rawNumStr = c.chapter_number || ""
    const extractedNum = parseInt(rawNumStr.replace(/\D/g, ''), 10)
    if (extractedNum === 119) {
      console.log(`Matched 119: id=${c.id}, chapter_number=${c.chapter_number}, chapter_title=${c.chapter_title}`)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
