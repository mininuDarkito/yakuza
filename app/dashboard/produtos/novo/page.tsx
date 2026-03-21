import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ProdutoForm } from "@/components/dashboard/vendas/VendaRegistroForm"
import { redirect } from "next/navigation"
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"
import { Suspense } from "react"

export default async function NovoProdutoPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) redirect("/login")

  try {
    const res = await sql.query('SELECT id, nome FROM grupos ORDER BY nome')
    const grupos = res.rows

    if (grupos.length === 0) {
      redirect("/dashboard/grupos/novo")
    }

    return (
      <div className="flex flex-col gap-8 p-6 lg:p-10">
        <div className="mb-4">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
            Registrar <span className="text-primary">Nova Obra</span>
          </h1>
          <p className="text-zinc-500 font-bold italic text-xs uppercase tracking-widest mt-1">
            Alimente o catálogo global e defina o preço de entrada.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start">
          <div className="w-full max-w-3xl">
            {/* Suspense é obrigatório para componentes que usam useSearchParams no Next.js 14/15 */}
            <Suspense fallback={<div className="text-white font-black italic">CARREGANDO FORMULÁRIO...</div>}>
              <ProdutoForm grupos={grupos} />
            </Suspense>
          </div>

          <div className="w-full hidden xl:block">
             <TabelaGlobal />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    return <div className="p-10 text-red-500 font-black italic">ERRO AO CARREGAR GRUPOS GLOBAIS.</div>
  }
}