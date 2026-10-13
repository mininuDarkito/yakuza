import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { UsersTable } from "@/components/dashboard/admin/users-table"
import { SeriesManager } from "@/components/dashboard/admin/series-manager"
import { EditVendasAdmin } from "@/components/dashboard/admin/EditVendasAdmin"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShieldCheck, Users,
  Activity, Database, LayoutDashboard,
  Edit3
} from "lucide-react"
import { OverviewPanel } from "@/components/dashboard/admin/OverviewPanel"

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== 'admin') {
    redirect("/dashboard")
  }

  // 5 Promessas separadas para resultados do painel
  const [statsRes, monthlyRes, usersRes, gruposRes, seriesSalesRes] = await Promise.all([
    // 1. Estatísticas Gerais
    sql.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM users) as total_users,
        (SELECT COUNT(*)::int FROM produtos) as total_produtos,
        (SELECT COALESCE(SUM(preco_total), 0) FROM vendas) as gmv_total
    `),
    // 2. Performance Mensal por Ano, Usuário e Grupo
    sql.query(`
      SELECT 
        EXTRACT(YEAR FROM data_venda AT TIME ZONE 'UTC')::int as ano,
        EXTRACT(MONTH FROM data_venda AT TIME ZONE 'UTC')::int as mes_index,
        user_id,
        grupo_id,
        SUM(preco_total)::float as total
      FROM vendas
      GROUP BY ano, mes_index, user_id, grupo_id
      ORDER BY ano DESC, mes_index ASC
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
    // 4. Lista de Grupos (Para o EditVendasAdmin e OverviewPanel)
    sql.query(`SELECT id, nome FROM grupos ORDER BY nome ASC`),
    // 5. Ranking de Séries com maior venda por mês e filtros
    sql.query(`
      SELECT 
        p.id as produto_id,
        p.nome,
        p.descricao,
        p.imagem_url,
        EXTRACT(YEAR FROM COALESCE(v.data_venda, v.created_at, NOW()) AT TIME ZONE 'UTC')::int as ano,
        EXTRACT(MONTH FROM COALESCE(v.data_venda, v.created_at, NOW()) AT TIME ZONE 'UTC')::int as mes_index,
        v.user_id,
        v.grupo_id,
        g.nome as grupo_nome,
        COUNT(v.id)::int as qtd,
        COALESCE(SUM(v.preco_total), 0)::float as receita
      FROM vendas v
      JOIN produtos p ON v.produto_id = p.id
      LEFT JOIN grupos g ON v.grupo_id = g.id
      GROUP BY p.id, p.nome, p.descricao, p.imagem_url, ano, mes_index, v.user_id, v.grupo_id, g.nome
      ORDER BY qtd DESC
    `)
  ]);

  const stats = statsRes.rows[0];
  const monthlySales = monthlyRes.rows;
  const allUsers = usersRes.rows;
  const allGrupos = gruposRes.rows;
  const seriesSales = seriesSalesRes.rows;

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
          <TabsList className="bg-zinc-950 border border-white/10 p-1 h-auto grid grid-cols-2 md:grid-cols-4 lg:w-fit gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Edit3 className="h-3.5 w-3.5 mr-2" /> Ajustes
            </TabsTrigger>
            <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Database className="h-3.5 w-3.5 mr-2" /> Catálogo
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase text-[10px] py-2">
              <Users className="h-3.5 w-3.5 mr-2" /> Vendedores
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <OverviewPanel
              totais={{
                users: stats.total_users,
                produtos: stats.total_produtos,
              }}
              monthlySales={monthlySales}
              vendedores={allUsers}
              grupos={allGrupos}
              seriesSales={seriesSales}
            />
          </TabsContent>

          {/* CONTEÚDO: AUDITORIA */}
          <TabsContent value="auditoria" className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-1 mb-4">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Central de Auditoria</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase italic">Corrija lançamentos, vincule grupos e sele o faturamento mensal</p>
            </div>

            <EditVendasAdmin
              usuarios={allUsers}
              grupos={allGrupos}
            />
          </TabsContent>

          {/* ABA 3: CATALOG */}
          <TabsContent value="catalog" className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-black uppercase tracking-tighter leading-none italic">Gerenciamento de Infraestrutura</h2>
            </div>
            <SeriesManager />
          </TabsContent>

          {/* ABA 4: USERS */}
          <TabsContent value="users" className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 mb-6 italic text-primary">
              <Users className="h-5 w-5" /> Ranking de Vendedores
            </h2>
            <UsersTable users={allUsers} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  )
}