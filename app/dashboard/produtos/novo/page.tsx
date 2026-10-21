import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { ProdutoForm } from "@/components/dashboard/produtos/ProdutoForm"
import { TabelaGlobal } from "@/components/dashboard/produtos/tabela-global"
import { MasterControl } from "@/components/dashboard/admin/MasterControl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers, Zap } from "lucide-react"

export const dynamic = "force-dynamic";

export default async function NovoProdutoPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/logar")

  // Busca todos os grupos do sistema
  const gruposRes = await sql.query(`
    SELECT id, nome 
    FROM grupos 
    ORDER BY 
      CASE WHEN nome ILIKE '%global%' THEN 0 ELSE 1 END, 
      nome ASC
  `)
  const grupos = gruposRes.rows

  // Busca lista de usuários para o Controle Mestre (Se for admin busca todos, senão retorna o próprio usuário)
  let usuarios: { id: string; discord_username: string }[] = []
  if (session.user.role === 'admin') {
    const usersRes = await sql.query(`
      SELECT id, discord_username 
      FROM users 
      ORDER BY discord_username ASC
    `)
    usuarios = usersRes.rows
  } else {
    usuarios = [{
      id: session.user.id,
      discord_username: session.user.name || "Seu Perfil"
    }]
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-10 max-w-7xl mx-auto min-h-screen">

      {/* HEADER DA PÁGINA */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black uppercase italic text-white tracking-tighter">
            Cadastrar <span className="text-primary">Série / Obra</span>
          </h1>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mt-1">
            Gestão de obras, vínculos de catálogo e controle mestre de injeção em massa.
          </p>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE CADASTRO INDIVIDUAL E CONTROLE MESTRE */}
      <Tabs defaultValue="individual" className="space-y-8">
        <TabsList className="bg-zinc-950 border border-white/10 p-1 h-auto grid grid-cols-1 sm:grid-cols-2 w-full sm:w-fit gap-1">
          <TabsTrigger
            value="individual"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-xs py-2.5 px-6"
          >
            <Layers className="h-4 w-4 mr-2" /> Cadastro / Vínculo de Obra
          </TabsTrigger>
          <TabsTrigger
            value="master"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-xs py-2.5 px-6"
          >
            <Zap className="h-4 w-4 mr-2" /> Controle Mestre (Injeção em Massa)
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: CADASTRO / VÍNCULO INDIVIDUAL */}
        <TabsContent value="individual" className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
            <Suspense fallback={
              <div className="flex items-center justify-center p-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                <div className="font-black italic text-zinc-500 animate-pulse uppercase tracking-widest text-xs">
                  Preparando Formulário...
                </div>
              </div>
            }>
              <ProdutoForm grupos={grupos} />
            </Suspense>

            <div className="hidden xl:block">
              <TabelaGlobal />
            </div>
          </div>
        </TabsContent>

        {/* ABA 2: CONTROLE MESTRE (INJEÇÃO EM MASSA) */}
        <TabsContent value="master" className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-zinc-950/40 border border-white/5 rounded-3xl p-6 mb-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> Controle Mestre de Injeção & Scraper Automático
            </h2>
            <p className="text-zinc-500 text-xs font-medium italic mt-1">
              Cole links de capítulos ou nomes de obras para fazer varredura e cadastrar vendas/capítulos em lote instantaneamente.
            </p>
          </div>
          <MasterControl usuarios={usuarios} gruposInitial={grupos} />
        </TabsContent>
      </Tabs>
    </div>
  )
}