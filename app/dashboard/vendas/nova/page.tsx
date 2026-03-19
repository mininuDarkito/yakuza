import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { VendaForm } from "@/components/dashboard/vendas/venda-form"
import { redirect } from "next/navigation"
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"
import { Suspense } from "react"
import { Layers3, BookOpen, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function NovaVendaPage(props: {
  searchParams: Promise<{ produto_id?: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { produto_id } = await props.searchParams

  if (!userId) redirect("/login")

  // --- FUNÇÃO DE VALIDAÇÃO DE UUID (Blindagem Total) ---
  const isValidUuid = (id: any): id is string => {
    if (!id || typeof id !== 'string' || id === "undefined" || id === "null") return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // --- LÓGICA DE AUTO-VÍNCULO ---
  // Só executa se o produto_id for um UUID real
  if (isValidUuid(produto_id)) {
    const checkRes = await sql.query(
      "SELECT id FROM user_series WHERE user_id = $1 AND produto_id = $2",
      [userId, produto_id]
    )

    if (checkRes.rows.length === 0) {
      const grupoRes = await sql.query(
        "SELECT id FROM grupos WHERE user_id = $1 LIMIT 1",
        [userId]
      )
      
      const grupoPadrao = grupoRes.rows[0]?.id
      
      if (grupoPadrao) {
        await sql.query(`
          INSERT INTO user_series (user_id, produto_id, grupo_id, preco, ativo)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (user_id, produto_id, grupo_id) DO NOTHING
        `, [userId, produto_id, grupoPadrao, 1.00]) 
      }
    }
  }

  // --- CARREGAMENTO DOS DADOS ---
  const [gruposRes, produtosRes] = await Promise.all([
    sql.query('SELECT id, nome FROM grupos WHERE user_id = $1 ORDER BY nome', [userId]),
    sql.query(`
      SELECT 
        us.id, 
        p.nome, 
        p.imagem_url, 
        us.preco, 
        us.grupo_id,
        p.plataforma
      FROM produtos p
      INNER JOIN user_series us ON p.id = us.produto_id
      WHERE us.user_id = $1 AND us.ativo = true
      ORDER BY p.nome
    `, [userId]),
  ])

  const grupos = gruposRes.rows
  const produtos = produtosRes.rows

  // Redireciona apenas se não houver produtos ativos e não houver tentativa de vínculo válida
  if (produtos.length === 0 && !isValidUuid(produto_id)) {
    redirect("/dashboard/produtos")
  }

  return (
    <div className="container mx-auto p-4 md:p-8 lg:p-12">
      {/* ... (Restante do JSX do Header e Grid igual ao anterior) ... */}
      <div className="flex flex-col gap-2 mb-10">
        <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
                <Layers3 className="text-primary h-6 w-6 animate-pulse" />
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic">
              Finalizar <span className="text-primary">Registro</span>
            </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
        <div className="xl:col-span-7 w-full order-1">
          <Suspense fallback={<Loader2 className="animate-spin text-primary" />}>
            <VendaForm 
              grupos={grupos} 
              produtos={produtos} 
              initialProdutoId={isValidUuid(produto_id) ? produto_id : undefined} 
            />
          </Suspense>
        </div>
        <div className="xl:col-span-5 w-full order-2 hidden xl:block">
            <TabelaGlobal />
        </div>
      </div>
    </div>
  )
}