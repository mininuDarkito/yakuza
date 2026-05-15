import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migração de membros de grupo...')

  // 1. Pegar todos os user_series (vínculos atuais)
  const userSeries = await prisma.user_series.findMany({
    select: {
      user_id: true,
      grupo_id: true,
    },
    distinct: ['user_id', 'grupo_id'],
  })

  console.log(`📦 Encontrados ${userSeries.length} vínculos únicos (usuário <-> grupo) para migrar.`)

  let migratedCount = 0
  for (const link of userSeries) {
    try {
      await prisma.membros_grupo.upsert({
        where: {
          user_id_grupo_id: {
            user_id: link.user_id,
            grupo_id: link.grupo_id,
          },
        },
        update: {},
        create: {
          user_id: link.user_id,
          grupo_id: link.grupo_id,
        },
      })
      migratedCount++
    } catch (e) {
      console.error(`❌ Erro ao migrar vínculo: ${link.user_id} -> ${link.grupo_id}`, e)
    }
  }

  // 2. Garantir que os donos dos grupos também sejam membros
  const grupos = await prisma.grupos.findMany({
    select: {
      id: true,
      user_id: true,
    }
  })

  console.log(`👑 Verificando ${grupos.length} proprietários de grupos...`)

  let ownerCount = 0
  for (const grupo of grupos) {
    try {
      await prisma.membros_grupo.upsert({
        where: {
          user_id_grupo_id: {
            user_id: grupo.user_id,
            grupo_id: grupo.id,
          },
        },
        update: {},
        create: {
          user_id: grupo.user_id,
          grupo_id: grupo.id,
        },
      })
      ownerCount++
    } catch (e) {
      console.error(`❌ Erro ao adicionar dono do grupo: ${grupo.user_id} -> ${grupo.id}`, e)
    }
  }

  console.log(`✅ Migração concluída!`)
  console.log(`📊 Membros migrados via user_series: ${migratedCount}`)
  console.log(`📊 Proprietários verificados: ${ownerCount}`)
}

main()
  .catch((e) => {
    console.error('❌ Erro crítico na migração:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
