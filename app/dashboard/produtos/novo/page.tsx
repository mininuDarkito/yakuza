import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ProdutoForm } from "@/components/dashboard/produtos/produto-form"
import { redirect } from "next/navigation"
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"


export default async function NovoProdutoPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  try {
    const res = await sql.query(
      'SELECT id, nome FROM grupos WHERE user_id = $1 ORDER BY nome',
      [userId]
    )
    const grupos = res.rows

    if (grupos.length === 0) {
      redirect("/dashboard/grupos/novo")
    }

    return (
  <div className="container mx-auto p-4 md:p-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Novo Produto</h1>
      <p className="text-muted-foreground">Cadastre um novo produto no seu catálogo</p>
    </div>

    {/* GRID PRINCIPAL RESPONSIVO */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
      
      {/* Coluna 1: Formulário (Fica no topo no mobile) */}
      <div className="w-full max-w-2xl mx-auto xl:mx-0">
        <ProdutoForm grupos={grupos} />
      </div>

      {/* Coluna 2: Tabelas de Referência */}
      <div className="w-full space-y-6">
        <TabelaGlobal />
      </div>

    </div>
  </div>
)
  } catch (error) {
    console.error("Erro ao buscar grupos:", error)
    return <div>Erro ao carregar dados.</div>
  }
}