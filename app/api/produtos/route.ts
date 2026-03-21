import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

const produtoSchema = z.object({
  id: z.string().uuid().optional().nullable(), 
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  preco: z.number().nonnegative("Preço não pode ser negativo"),
  ativo: z.boolean().default(true),
  grupo_id: z.string().uuid("Selecione um grupo global válido"),
  imagem_url: z.string().optional().nullable(),
  link_serie: z.string().url("URL inválida").optional().nullable(),
  plataforma: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    // Retorna o Catálogo Global + Vínculos do Usuário
    // Importante: p.id é o ID da OBRA, us.id é o ID do VÍNCULO (usado para DELETE/EDIT)
    const res = await sql.query(`
      SELECT 
        us.id as vinculo_id,
        p.id as produto_id, 
        p.nome, 
        p.plataforma, 
        p.imagem_url,
        p.link_serie,
        p.descricao,
        us.preco, 
        us.ativo, 
        g.nome as grupo_nome, 
        us.grupo_id
      FROM produtos p
      INNER JOIN user_series us ON p.id = us.produto_id
      LEFT JOIN grupos g ON us.grupo_id = g.id
      WHERE us.user_id = $1
      ORDER BY p.nome ASC
    `, [userId])

    return NextResponse.json(res.rows)
  } catch (error) {
    console.error("❌ Erro no GET produtos:", error)
    return NextResponse.json({ error: "Erro ao buscar catálogo" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    // Pegamos o ID do vínculo (user_series) da URL
    const { searchParams } = new URL(request.url);
    const vinculoId = searchParams.get("id");

    if (!vinculoId) return NextResponse.json({ error: "ID do vínculo é obrigatório" }, { status: 400 });

    // 1. Buscamos o produto_id antes de deletar o vínculo (para auditoria e limpeza global)
    const findVinculo = await sql.query(
        "SELECT produto_id FROM user_series WHERE id = $1 AND user_id = $2",
        [vinculoId, userId]
    );

    if (findVinculo.rowCount === 0) {
        return NextResponse.json({ error: "Vínculo não encontrado ou não pertence a você" }, { status: 404 });
    }

    const produtoId = findVinculo.rows[0].produto_id;

    // 2. Remove apenas o vínculo específico
    await sql.query("DELETE FROM user_series WHERE id = $1", [vinculoId]);

    // 3. Se for ADMIN, verifica se a obra ficou "orfã" no catálogo global
    if (userRole === 'admin') {
      const checkUsage = await sql.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM vendas WHERE produto_id = $1) as vendas_count,
          (SELECT COUNT(*)::int FROM user_series WHERE produto_id = $1) as links_count
      `, [produtoId]);

      const { vendas_count, links_count } = checkUsage.rows[0];

      // Só apaga do catálogo global se ninguém mais usar e não houver histórico de vendas
      if (vendas_count === 0 && links_count === 0) {
        await sql.query("DELETE FROM produtos WHERE id = $1", [produtoId]);
      }
    }

    // 4. Log
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'remove_vinculo', 'user_series', $2)
    `, [userId, vinculoId]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Erro no DELETE produtos:", error);
    return NextResponse.json({ error: "Erro ao processar remoção" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  try {
    const body = await request.json()
    
    // Tratamento de preço (vírgula para ponto) e validação Zod
    const cleanPreco = typeof body.preco === 'string' 
        ? parseFloat(body.preco.replace(',', '.')) 
        : body.preco;

    const data = produtoSchema.parse({ ...body, preco: cleanPreco });

    // 1. UPSERT Global (Mantém o acervo atualizado)
    const resProduto = await sql.query(`
      INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (nome) DO UPDATE SET 
        descricao = COALESCE(EXCLUDED.descricao, produtos.descricao),
        imagem_url = COALESCE(EXCLUDED.imagem_url, produtos.imagem_url),
        link_serie = COALESCE(EXCLUDED.link_serie, produtos.link_serie),
        plataforma = COALESCE(EXCLUDED.plataforma, produtos.plataforma)
      RETURNING id
    `, [data.nome.trim(), data.descricao, data.imagem_url, data.link_serie, data.plataforma])

    const produtoId = resProduto.rows[0].id;

    // 2. UPSERT do Vínculo (Lógica por ID ou por Constraint Única)
    let resVinculo;
    if (body.id) {
      // Edição de vínculo existente
      resVinculo = await sql.query(`
        UPDATE user_series 
        SET preco = $1, ativo = $2, grupo_id = $3, updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `, [data.preco, data.ativo, data.grupo_id, body.id, userId])
    } else {
      // Novo vínculo (Auto-vínculo ou Cadastro novo)
      resVinculo = await sql.query(`
        INSERT INTO user_series (user_id, produto_id, grupo_id, preco, ativo, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, produto_id, grupo_id) DO UPDATE SET
          preco = EXCLUDED.preco,
          ativo = EXCLUDED.ativo,
          updated_at = NOW()
        RETURNING *
      `, [userId, produtoId, data.grupo_id, data.preco, data.ativo])
    }

    return NextResponse.json({ success: true, vinculo: resVinculo.rows[0] }, { status: 201 })

  } catch (error: any) {
    console.error("❌ Erro no POST produtos:", error)
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: "Falha ao sincronizar obra" }, { status: 500 })
  }
}