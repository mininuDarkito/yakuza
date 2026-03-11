import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { UsersTable } from "@/components/dashboard/admin/users-table"
import { BulkSeriesForm } from "@/components/dashboard/admin/bulk-series-form"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { ShieldCheck, Users, Package, Landmark, Activity, Zap, Calendar } from "lucide-react"

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.role !== 'admin') {
    redirect("/dashboard")
  }

  // 1. Busca de Dados Globais e Performance Mensal da Plataforma
  const statsRes = await sql.query(`
    SELECT 
      (SELECT COUNT(*)::int FROM users) as total_users,
      (SELECT COUNT(*)::int FROM produtos) as total_produtos,
      (SELECT COALESCE(SUM(preco_total), 0) FROM vendas) as gmv_total
  `);
  const stats = statsRes.rows[0];

  // 2. NOVA QUERY: Faturamento Global por Mês (Janeiro, Fevereiro, Março...)
  const monthlyRes = await sql.query(`
    SELECT 
      TO_CHAR(created_at, 'MM') as mes_index,
      TO_CHAR(created_at, 'Mon') as mes_nome,
      SUM(preco_total) as total
    FROM vendas
    WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY mes_index, mes_nome
    ORDER BY mes_index ASC
  `);
  const performanceMensal = monthlyRes.rows;

  // 3. Listagem de Usuários com Performance Financeira
  const usersRes = await sql.query(`
    SELECT 
      u.id, 
      u.discord_username, 
      u.discord_avatar, 
      u.discord_id, 
      u.role,
      COUNT(v.id)::int as total_vendas,
      COALESCE(SUM(v.preco_total), 0) as faturamento_total
    FROM users u
    LEFT JOIN vendas v ON u.id = v.user_id
    GROUP BY u.id
    ORDER BY faturamento_total DESC
  `);
  const allUsers = usersRes.rows;

  return (
    <AdminGate>
      <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto">
        
        {/* HEADER DA CENTRAL DE COMANDO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
                Nexus Control
              </h1>
              <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-3 w-3 text-emerald-500" /> Sistema Online • Monitoramento Global
              </p>
            </div>
          </div>
        </div>

        {/* CARDS DE PERFORMANCE GLOBAL (SOMA TOTAL) */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-zinc-950 text-white border-none shadow-2xl relative overflow-hidden group">
            <Landmark className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 group-hover:scale-110 transition-transform" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase opacity-60 tracking-widest">Faturamento Global (GMV)</CardTitle>
              <div className="text-4xl font-black tracking-tighter italic text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.gmv_total)}
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest">Base de Vendedores</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black italic tracking-tighter">{stats.total_users}</div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Contas Ativas</p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors border-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest">Catálogo de Séries</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black italic tracking-tighter">{stats.total_produtos}</div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Obras Registradas</p>
            </CardContent>
          </Card>
        </div>

        {/* PERFORMANCE MENSAL GLOBAL (JAN, FEV, MAR...) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-black uppercase italic tracking-tighter">Performance Mensal da Rede ({new Date().getFullYear()})</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {performanceMensal.length > 0 ? (
              performanceMensal.map((m) => (
                <Card key={m.mes_index} className="border-2 shadow-md bg-muted/10 border-primary/5">
                  <CardContent className="p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">{m.mes_nome}</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 italic">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.total)}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-6 border-2 border-dashed rounded-2xl flex items-center justify-center text-muted-foreground font-bold uppercase text-xs italic">
                Aguardando primeiras vendas do ano...
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* GESTÃO DE USUÁRIOS */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tight">Ranking de Vendedores</h2>
            <UsersTable users={allUsers} />
          </div>

          {/* CADASTRO EM MASSA */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              <h2 className="text-xl font-black uppercase italic tracking-tight">Bulk Uploader</h2>
            </div>
            <Card className="border-primary/20 shadow-xl bg-primary/[0.01]">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase italic tracking-widest">Catálogo Global</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">
                  Povoamento rápido de séries por plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkSeriesForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGate>
  )
}