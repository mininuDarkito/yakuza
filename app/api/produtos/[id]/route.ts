import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const produtoSchema = z.object({
  grupo_id: z.string().uuid("Grupo inválido"),
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  preco: z.number().nonnegative("Preço deve ser positivo ou zero"),
  ativo: z.boolean().default(true),
  imagem_url: z.string().optional().nullable(),
  link_serie: z.string().url("Link inválido").optional().nullable(),
  plataforma: z.string().optional().nullable(),
})

// --- GET: BUSCAR DADOS DA SÉRIE + CONFIG PESSOAL ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id } = await params

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const res = await sql.query(`
      SELECT 
        p.*, 
        gs.preco, 
        us.ativo, 
        us.grupo_id, 
        g.nome as grupo_nome
      FROM produtos p
      INNER JOIN user_series us ON p.id = us.produto_id AND us.user_id = $2
      INNER JOIN grupos g ON us.grupo_id = g.id
      INNER JOIN grupo_series gs ON p.id = gs.produto_id AND us.grupo_id = gs.grupo_id
      WHERE p.id = $1
    `, [id, userId])

    const produto = res.rows[0]
    if (!produto) return NextResponse.json({ error: "Série não encontrada" }, { status: 404 })

    return NextResponse.json(produto)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar detalhes" }, { status: 500 })
  }
}



// --- DELETE: REMOVER VÍNCULO PELO ID DA TABELA ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id } = await params // Este 'id' agora é o PK da tabela user_series

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    // Deletamos usando o ID (PK) e validamos o usuário por segurança
    const resDelete = await sql.query(`
      DELETE FROM user_series 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [id, userId])

    if (resDelete.rowCount === 0) {
      // Se cair aqui, ou o ID não existe ou você está tentando deletar a config de outro user
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Vínculo removido!" })
  } catch (error: any) {
    console.error("❌ Erro no DELETE:", error.message)
    return NextResponse.json({ error: "Erro interno no banco de dados" }, { status: 500 })
  }
}


export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const userRole = session?.user?.role
  
  // Este 'id' é a PRIMARY KEY da tabela user_series (o ID do vínculo específico)
  const { id: vinculoId } = await params

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    const data = produtoSchema.parse({
        ...body,
        preco: typeof body.preco === 'string' ? parseFloat(body.preco.replace(',', '.')) : body.preco
    })

    // 1. Localizar o produto_id global antes de atualizar
    const resBusca = await sql.query(
      "SELECT produto_id FROM user_series WHERE id = $1 AND user_id = $2",
      [vinculoId, userId]
    )

    if (resBusca.rowCount === 0) {
      return NextResponse.json({ error: "Vínculo não encontrado" }, { status: 404 })
    }

    const produtoIdGlobal = resBusca.rows[0].produto_id

    // 2. Se for ADMIN, atualiza os dados GLOBAIS (Catálogo)
    if (userRole === 'admin') {
        await sql.query(`
            UPDATE produtos 
            SET nome = $1, descricao = $2, imagem_url = $3, link_serie = $4, plataforma = $5, updated_at = NOW()
            WHERE id = $6
        `, [data.nome.trim(), data.descricao, data.imagem_url, data.link_serie, data.plataforma, produtoIdGlobal])
    }

    // 3. ATUALIZAÇÃO CIRÚRGICA do vínculo específico (user_series)
    // Atualizamos pelo ID da PK, assim não afetamos o mesmo produto em outros grupos
    const resUpdate = await sql.query(`
      UPDATE user_series 
      SET 
          grupo_id = $1, 
          ativo = $2, 
          updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [data.grupo_id, data.ativo, vinculoId, userId])

    // 3.1. ATUALIZAÇÃO DO PREÇO UNIFICADO (grupo_series)
    await sql.query(`
      INSERT INTO grupo_series (produto_id, grupo_id, preco, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (grupo_id, produto_id) 
      DO UPDATE SET preco = EXCLUDED.preco, updated_at = NOW()
    `, [produtoIdGlobal, data.grupo_id, data.preco])

    // 4. Log de Atividade
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'update_product_config', 'user_series', $2, $3)
    `, [userId, vinculoId, JSON.stringify({ preco: data.preco, grupo_id: data.grupo_id })])

    return NextResponse.json(resUpdate.rows[0])
  } catch (error: any) {
    console.error("❌ Erro no PUT:", error.message)
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro na atualização" }, { status: 500 })
  }
}