import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ProdutoForm } from "@/components/dashboard/produtos/produto-form"
import { redirect } from "next/navigation"
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"


export default async function NovoProdutoPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  // Verificação de segurança
  if (!userId) {
    redirect("/login")
  }

  // No driver 'pg' local, usamos o método .query e passamos o userId no array [$1]
  const res = await sql.query(
    'SELECT id, nome FROM grupos WHERE user_id = $1 ORDER BY nome',
    [userId]
  )

  // No 'pg', os dados estão em res.rows
  const grupos = res.rows

  // Se o usuário não tiver nenhum grupo criado, redirecionamos
  if (grupos.length === 0) {
    redirect("/dashboard/grupos/novo")
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        
        <h1 className="text-3xl font-bold tracking-tight">Novo Produto</h1>
        <p className="text-muted-foreground">
          Cadastre um novo produto
        </p>
        
      </div>

      <div className="columns-2">
      {/* Passamos o array de grupos para o formulário popular o Select/Dropdown */}
      <ProdutoForm grupos={grupos} />
      <TabelaGlobal/>
      </div>
      

      


    </div>
  )
}