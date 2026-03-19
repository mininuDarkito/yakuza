import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

// Schema validando a estrutura de Grupos Globais
const produtoSchema = z.object({
  id: z.string().uuid().optional().nullable(), // ID opcional para edições
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

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // Retorna o Catálogo Global + O vínculo de preço do usuário logado
    // Se o usuário for Admin, ele vê tudo. Se for editor, vê o que ele configurou.
    const res = await sql.query(`
      SELECT 
        p.id, 
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
      LEFT JOIN user_series us ON p.id = us.produto_id AND us.user_id = $1
      LEFT JOIN grupos g ON us.grupo_id = g.id
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

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const produtoId = searchParams.get("id");

    if (!produtoId) {
      return NextResponse.json({ error: "ID do produto é obrigatório" }, { status: 400 });
    }

    // 1. SEMPRE remover o vínculo do usuário (user_series)
    // Isso faz com que a série pare de aparecer no comando /venda daquele usuário/grupo
    await sql.query(
      "DELETE FROM user_series WHERE produto_id = $1 AND user_id = $2",
      [produtoId, userId]
    );

    // 2. TENTAR remover do Catálogo Global (Apenas se for ADMIN)
    if (userRole === 'admin') {
      // Verificamos se existem vendas vinculadas a esse produto
      const resVendas = await sql.query(
        "SELECT COUNT(*)::int as count FROM vendas WHERE produto_id = $1",
        [produtoId]
      );

      // Verificamos se outros usuários ainda têm essa série configurada
      const resOutrosUsers = await sql.query(
        "SELECT COUNT(*)::int as count FROM user_series WHERE produto_id = $1",
        [produtoId]
      );

      if (resVendas.rows[0].count === 0 && resOutrosUsers.rows[0].count === 0) {
        // Se ninguém usa e não tem venda, podemos limpar o catálogo global
        await sql.query("DELETE FROM produtos WHERE id = $1", [produtoId]);
      } else {
        // Se tiver vendas, apenas desativamos globalmente (opcional)
        // console.log("Produto mantido no catálogo por possuir histórico ou outros vínculos.");
      }
    }

    // 3. Log de Atividade
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id)
      VALUES ($1, 'remove_product_link', 'produto', $2)
    `, [userId, produtoId]);

    return NextResponse.json({ success: true, message: "Vínculo removido com sucesso" });

  } catch (error: any) {
    console.error("❌ Erro no DELETE produtos:", error);
    return NextResponse.json({ error: "Erro ao processar remoção" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const userRole = session?.user?.role

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    // Tratamento de tipos
    const data = produtoSchema.parse({
      ...body,
      preco: typeof body.preco === 'string' ? parseFloat(body.preco.replace(',', '.')) : body.preco
    })

    // 1. UPSERT no Catálogo Global (produtos)
    const resProduto = await sql.query(`
      INSERT INTO produtos (nome, descricao, imagem_url, link_serie, plataforma)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (nome) DO UPDATE SET 
        descricao = COALESCE(EXCLUDED.descricao, produtos.descricao),
        imagem_url = COALESCE(EXCLUDED.imagem_url, produtos.imagem_url),
        link_serie = COALESCE(EXCLUDED.link_serie, produtos.link_serie),
        plataforma = COALESCE(EXCLUDED.plataforma, produtos.plataforma)
      RETURNING id, nome
    `, [data.nome.trim(), data.descricao, data.imagem_url, data.link_serie, data.plataforma])

    const produtoId = resProduto.rows[0].id

    // 2. UPSERT no Vínculo de Preço do Grupo (user_series)
    // Se enviarmos o 'id' do corpo, atualizamos por ID. 
    // Se não, tentamos inserir e se houver conflito de [user+produto+grupo], atualizamos o preço/ativo.
    let resVinculo;

    if (body.id) {
      // Atualização direta de um vínculo existente
      resVinculo = await sql.query(`
        UPDATE user_series 
        SET preco = $1, ativo = $2, grupo_id = $3, updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `, [data.preco, data.ativo, data.grupo_id, body.id, userId])
    } else {
      // Novo vínculo ou atualização por conflito de canal
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

    if (resVinculo.rowCount === 0) {
      return NextResponse.json({ error: "Falha ao vincular: Registro não encontrado" }, { status: 404 })
    }

    // 3. Log de Auditoria
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
      VALUES ($1, 'sync_product_v2', 'user_series', $2, $3)
    `, [userId, resVinculo.rows[0].id, JSON.stringify({ 
        nome: resProduto.rows[0].nome, 
        grupo_id: data.grupo_id, 
        preco: data.preco 
      })])

    return NextResponse.json({
      success: true,
      produto: resProduto.rows[0],
      config: resVinculo.rows[0]
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ Erro no POST produtos:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Falha ao sincronizar obra" }, { status: 500 })
  }
}