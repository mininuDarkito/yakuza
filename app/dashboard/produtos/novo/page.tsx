import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { ProdutoForm } from "@/components/dashboard/produtos/ProdutoForm" 
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"

export default async function NovoProdutoPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  // CORREÇÃO: Removemos o WHERE user_id para buscar todos os grupos do sistema
  // Adicionei uma lógica para colocar o "Global" ou grupos principais no topo, se desejar
  const res = await sql.query(`
    SELECT id, nome 
    FROM grupos 
    ORDER BY 
      CASE WHEN nome ILIKE '%global%' THEN 0 ELSE 1 END, 
      nome ASC
  `)
  const grupos = res.rows

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-black uppercase italic text-white">
          Vincular <span className="text-primary">Obra</span>
        </h1>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
        <Suspense fallback={
          <div className="flex items-center justify-center p-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
            <div className="font-black italic text-zinc-500 animate-pulse uppercase tracking-widest">
              Preparando Terminal...
            </div>
          </div>
        }>
          <ProdutoForm grupos={grupos} />
        </Suspense>
        
        <div className="hidden xl:block">
          <TabelaGlobal />
        </div>
      </div>
    </div>
  )
}