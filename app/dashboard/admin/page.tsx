import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { UsersTable } from "@/components/dashboard/admin/users-table"
import { BulkScraperForm } from "@/components/dashboard/admin/BulkScraperForm"
import { SeriesManager } from "@/components/dashboard/admin/series-manager"
import { MasterControl } from "@/components/dashboard/admin/MasterControl"
import { EditVendasAdmin } from "@/components/dashboard/admin/EditVendasAdmin"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ShieldCheck, Users, Landmark, 
  Activity, Zap, Calendar, Database, LayoutDashboard,
  GanttChartSquare, Edit3 
} from "lucide-react"

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    redirect("/dashboard")
  }

  // CORREÇÃO: 4 Promessas separadas para 4 resultados distintos
  const [statsRes, monthlyRes, usersRes, gruposRes] = await Promise.all([
    // 1. Estatísticas Gerais
    sql.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM users) as total_users,
        (SELECT COUNT(*)::int FROM produtos) as total_produtos,
        (SELECT COALESCE(SUM(preco_total), 0) FROM vendas) as gmv_total
    `),
    // 2. Performance Mensal
    sql.query(`
      SELECT 
        TO_CHAR(data_venda, 'MM') as mes_index,
        TO_CHAR(data_venda, 'Mon') as mes_nome,
        SUM(preco_total) as total
      FROM vendas
      WHERE data_venda >= DATE_TRUNC('year', CURRENT_DATE)
      GROUP BY mes_index, mes_nome
      ORDER BY mes_index ASC
    `),
    // 3. Ranking de Usuários
    sql.query(`
      SELECT 
        u.id, u.discord_username, u.discord_avatar, u.discord_id, u.role,
        COUNT(v.id)::int as total_vendas,
        COALESCE(SUM(v.preco_total), 0) as faturamento_total
      FROM users u
      LEFT JOIN vendas v ON u.id = v.user_id
      GROUP BY u.id
      ORDER BY faturamento_total DESC
    `),
    // 4. Lista de Grupos (Para o EditVendasAdmin)
    sql.query(`SELECT id, nome FROM grupos ORDER BY nome ASC`)
  ]);

  const stats = statsRes.rows[0];
  const performanceMensal = monthlyRes.rows;
  const allUsers = usersRes.rows;
  const allGrupos = gruposRes.rows;

  return (
    <AdminGate>
      <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">Painel Yakuza</h1>
              <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
                <Activity className="h-3 w-3 text-emerald-500" /> Terminal de Alta Hierarquia
              </p>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO POR ABAS */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-zinc-950 border border-white/10 p-1 h-auto grid grid-cols-2 md:grid-cols-6 lg:w-fit gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="operations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <GanttChartSquare className="h-3.5 w-3.5 mr-2" /> Operações
            </TabsTrigger>
            <TabsTrigger value="edit-vendas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Edit3 className="h-3.5 w-3.5 mr-2" /> Ajustes
            </TabsTrigger>
            <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Database className="h-3.5 w-3.5 mr-2" /> Catálogo
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Users className="h-3.5 w-3.5 mr-2" /> Vendedores
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Zap className="h-3.5 w-3.5 mr-2" /> Ingestão
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-zinc-950 text-white border-none shadow-2xl relative overflow-hidden group">
                <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase opacity-60 tracking-widest text-primary italic">Volume Bruto (GMV)</CardTitle>
                  <div className="text-4xl font-black tracking-tighter text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.gmv_total)}
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-zinc-900/10 border-2 border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Total Sellers</CardTitle>
                  <div className="text-3xl font-black tracking-tighter text-white">{stats.total_users}</div>
                </CardHeader>
              </Card>

              <Card className="bg-zinc-900/10 border-2 border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Séries Ativas</CardTitle>
                  <div className="text-3xl font-black tracking-tighter text-white">{stats.total_produtos}</div>
                </CardHeader>
              </Card>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black uppercase tracking-tighter italic">Performance Mensal ({new Date().getFullYear()})</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {performanceMensal.map((m) => (
                  <Card key={m.mes_index} className="border-2 border-white/5 bg-zinc-900/20 backdrop-blur-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{m.mes_nome}</p>
                      <p className="text-lg font-black text-emerald-500">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.total)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: OPERATIONS */}
          <TabsContent value="operations" className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <GanttChartSquare className="h-5 w-5" />
              <h2 className="text-xl font-black uppercase tracking-tighter leading-none italic">Controle Mestre de Injeção</h2>
            </div>
            <MasterControl usuarios={allUsers} />
          </TabsContent>

          {/* ABA 3: AJUSTES (EDIT VENDAS) */}
          <TabsContent value="edit-vendas" className="space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-6 text-primary">
                <Edit3 className="h-5 w-5" />
                <h2 className="text-xl font-black uppercase italic tracking-tighter">Correção de Lançamentos</h2>
            </div>
            <EditVendasAdmin usuarios={allUsers} grupos={allGrupos} />
          </TabsContent>

          {/* ABA 4: CATALOG */}
          <TabsContent value="catalog" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
             <div className="flex items-center gap-2 mb-6 text-primary">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-black uppercase tracking-tighter leading-none italic">Gerenciamento de Infraestrutura</h2>
            </div>
            <SeriesManager />
          </TabsContent>

          {/* ABA 5: USERS */}
          <TabsContent value="users" className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 mb-6 italic text-primary">
               <Users className="h-5 w-5" /> Ranking de Vendedores
            </h2>
            <UsersTable users={allUsers} />
          </TabsContent>

          {/* ABA 6: INFRASTRUCTURE */}
          <TabsContent value="infrastructure" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
             <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <h2 className="text-xl font-black uppercase tracking-tight leading-none italic">Cadastro Automático de Séries</h2>
              </div>
              <Card className="border-primary/20 shadow-xl bg-zinc-950">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary italic">Cadastro Rápido</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-zinc-500 italic">
                    Insira múltiplas obras de uma só vez no Painel Yakuza.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BulkScraperForm />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  )
}