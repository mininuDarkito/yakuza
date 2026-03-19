import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

// Schema atualizado para incluir o canal do Discord
const grupoSchema = z.object({
  nome: z.string().min(1, "O nome do grupo é obrigatório"),
  channel_id: z.string().min(1, "O ID do canal do Discord é obrigatório"),
  descricao: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  
  // Segurança: Apenas admins acessam a listagem bruta de gerenciamento
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 })
  }

  try {
    // Query que traz o Raio-X do grupo: Total de Obras e Faturamento de TODOS os usuários
    const res = await sql.query(`
      SELECT 
        g.*, 
        (SELECT COUNT(*) FROM user_series us WHERE us.grupo_id = g.id) as produtos_count,
        COALESCE((SELECT SUM(v.preco_total) FROM vendas v WHERE v.grupo_id = g.id), 0) as faturamento_total
      FROM grupos g
      ORDER BY faturamento_total DESC, g.created_at DESC
    `)

    return NextResponse.json(res.rows)
  } catch (error) {
    console.error("❌ Erro ao listar grupos:", error)
    return NextResponse.json({ error: "Erro ao buscar dados no banco" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  // Apenas Admins criam Grupos Globais
  if (session?.user?.role !== 'admin' || !userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = grupoSchema.parse(body)

    // 1. Inserir o grupo global vinculado ao canal do Discord
    // O channel_id deve ser ÚNICO no banco para evitar conflitos de bot
    const resGrupo = await sql.query(`
      INSERT INTO grupos (user_id, nome, channel_id, descricao)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (channel_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao
      RETURNING *
    `, [userId, data.nome, data.channel_id, data.descricao || null])

    const grupo = resGrupo.rows[0]

    // 2. Log de atividade administrativo
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'create_global_group', 'grupo', $2, $3)
    `, [
      userId, 
      grupo.id, 
      JSON.stringify({ nome: grupo.nome, channel: grupo.channel_id })
    ])

    return NextResponse.json(grupo, { status: 201 })
  } catch (error: any) {
    console.error("❌ Erro na criação de Grupo Global:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    // Erro de duplicidade manual caso o ON CONFLICT não seja suficiente
    if (error.code === '23505') {
      return NextResponse.json({ error: "Este canal do Discord já está registrado em outro grupo." }, { status: 409 })
    }

    return NextResponse.json({ error: "Erro interno ao salvar grupo" }, { status: 500 })
  }
}