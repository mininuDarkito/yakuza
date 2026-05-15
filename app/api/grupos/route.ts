import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const grupoSchema = z.object({
  nome: z.string().min(1, "O nome do grupo é obrigatório"),
  channel_id: z.string().min(1, "O ID do canal do Discord é obrigatório"),
  descricao: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  try {
    // Usando queryRaw para manter a performance das subqueries complexas de agregação
    const grupos = await prisma.$queryRaw`
      SELECT 
        g.*, 
        (SELECT COUNT(*)::int FROM user_series us WHERE us.grupo_id = g.id) as produtos_count,
        COALESCE((SELECT SUM(v.preco_total) FROM vendas v WHERE v.grupo_id = g.id), 0) as faturamento_total
      FROM grupos g
      ORDER BY faturamento_total DESC, g.created_at DESC
    `

    return NextResponse.json(grupos)
  } catch (error) {
    console.error("❌ Erro ao listar grupos:", error)
    return NextResponse.json({ error: "Erro ao buscar dados no banco" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (session?.user?.role !== 'admin' || !userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = grupoSchema.parse(body)

    // Upsert usando Prisma para o grupo
    const grupo = await prisma.grupos.upsert({
      where: { channel_id: data.channel_id },
      update: {
        nome: data.nome,
        descricao: data.descricao || null,
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        nome: data.nome,
        channel_id: data.channel_id,
        descricao: data.descricao || null,
      },
    })

    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        action: 'create_global_group',
        entity_type: 'grupo',
        entity_id: grupo.id,
        details: { nome: grupo.nome, channel: grupo.channel_id }
      }
    })

    return NextResponse.json(grupo, { status: 201 })
  } catch (error: any) {
    console.error("❌ Erro na criação de Grupo Global:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    // Erro P2002 é o código do Prisma para violação de Unique Constraint
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Este canal do Discord já está registrado em outro grupo." }, { status: 409 })
    }

    return NextResponse.json({ error: "Erro interno ao salvar grupo" }, { status: 500 })
  }
}