import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { VendaForm } from "@/components/dashboard/vendas/venda-form"
import { redirect } from "next/navigation"
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"

export default async function NovaVendaPage(props: {
  searchParams: Promise<{ produto_id?: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const searchParams = await props.searchParams
  const produto_id = searchParams.produto_id

  if (!userId) {
    redirect("/login")
  }

  // --- LÓGICA DE AUTO-VÍNCULO (O PULO DO GATO) ---
  if (produto_id) {
    // 1. Verifica se o vínculo já existe
    const checkRes = await sql.query(
      "SELECT id FROM user_series WHERE user_id = $1 AND produto_id = $2",
      [userId, produto_id]
    )

    // 2. Se não existe, cria automaticamente para a série aparecer no formulário
    if (checkRes.rows.length === 0) {
      // Busca o primeiro grupo do usuário para não deixar o campo vazio
      const grupoRes = await sql.query(
        "SELECT id FROM grupos WHERE user_id = $1 LIMIT 1",
        [userId]
      )
      
      const grupoPadrao = grupoRes.rows[0]?.id

      // Se o usuário não tiver nem grupo, redirecionamos para ele criar um primeiro
      if (!grupoPadrao) {
        redirect("/dashboard/grupos?error=create_group_first")
      }

      await sql.query(`
        INSERT INTO user_series (user_id, produto_id, grupo_id, preco, ativo)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (user_id, produto_id) DO NOTHING
      `, [userId, produto_id, grupoPadrao, 10.00]) // Preço padrão sugerido
    }
  }

  // --- CARREGAMENTO DOS DADOS ---
  const [gruposRes, produtosRes] = await Promise.all([
    sql.query('SELECT id, nome FROM grupos WHERE user_id = $1 ORDER BY nome', [userId]),
    sql.query(`
      SELECT 
        p.id, 
        p.nome, 
        p.imagem_url, 
        us.preco, 
        us.grupo_id
      FROM produtos p
      INNER JOIN user_series us ON p.id = us.produto_id
      WHERE us.user_id = $1 AND us.ativo = true
      ORDER BY p.nome
    `, [userId]),
  ])

  const grupos = gruposRes.rows
  const produtos = produtosRes.rows

  // Se após o auto-vínculo ele ainda não tiver produtos ativos, manda configurar
  if (produtos.length === 0) {
    redirect("/dashboard/produtos")
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-black uppercase tracking-tighter">
          Finalizar Registro
        </h1>
        <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest opacity-60">
          Confirme os detalhes da venda abaixo
        </p>
      </div>

      <div className="w-full grid-cols-1 sm:grid-cols-2, md:grid-cols-3 lg:grid-cols-4">

      <VendaForm 
        grupos={grupos} 
        produtos={produtos} 
        initialProdutoId={produto_id} 
      />
      <TabelaGlobal/>
      </div>

    </div>
  )
}