import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FolderOpen, Package, ShoppingCart, TrendingUp } from "lucide-react"
import Link from "next/link"
import { RecentSales } from "@/components/dashboard/recent-sales"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return <div>Acesso negado. Por favor, faça login.</div>
  }

  // Execução paralela otimizada com Prisma
  const [
    gruposCount,
    produtosCount,
    vendasCount,
    totalVendasRes,
    recentVendasRaw
  ] = await Promise.all([
    prisma.grupos.count({ where: { user_id: userId } }),
    prisma.user_series.count({ where: { user_id: userId, ativo: true } }),
    prisma.vendas.count({ where: { user_id: userId } }),
    prisma.vendas.aggregate({
      _sum: { preco_total: true },
      where: { user_id: userId }
    }),
    prisma.vendas.findMany({
      where: { user_id: userId },
      include: {
        produtos: { select: { nome: true, imagem_url: true } },
        grupos: { select: { nome: true } }
      },
      orderBy: [
        { data_venda: 'desc' },
        { id: 'desc' }
      ],
      take: 5
    })
  ])

  // Formatação dos dados recentes para manter compatibilidade com o componente RecentSales
  const recentVendas = recentVendasRaw.map(v => ({
    ...v,
    capitulo: Number(v.capitulo),
    preco_unitario: Number(v.preco_unitario),
    preco_total: Number(v.preco_total),
    created_at: v.created_at ? v.created_at.toISOString() : new Date().toISOString(),
    produto_nome: v.produtos.nome,
    imagem_url: v.produtos.imagem_url,
    grupo_nome: v.grupos?.nome || "Sem Grupo"
  }))

  const totalVendasValor = Number(totalVendasRes._sum.preco_total || 0)

  const stats = [
    {
      title: "Meus Grupos",
      value: gruposCount,
      icon: FolderOpen,
      href: "/dashboard/grupos",
    },
    {
      title: "Séries Ativas",
      value: produtosCount,
      icon: Package,
      href: "/dashboard/produtos",
    },
    {
      title: "Caps. Vendidos",
      value: vendasCount,
      icon: ShoppingCart,
      href: "/dashboard/vendas",
    },
    {
      title: "Receita Total",
      value: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "USD",
      }).format(totalVendasValor),
      icon: TrendingUp,
      href: "/dashboard/vendas",
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {session?.user?.discordUsername || session?.user?.name}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-accent/50 transition-all cursor-pointer hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>
              Os últimos capítulos registrados em seus grupos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales vendas={recentVendas} />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Operações frequentes do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href="/dashboard/vendas/nova"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-primary hover:text-primary-foreground transition-all group"
            >
              <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <div className="flex flex-col">
                <span className="font-bold">Registrar Venda</span>
                <span className="text-xs opacity-70">Lançar novos capítulos</span>
              </div>
            </Link>
            
            <Link
              href="/dashboard/produtos"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent transition-all"
            >
              <Package className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-bold">Catálogo Global</span>
                <span className="text-xs text-muted-foreground">Ativar novas séries</span>
              </div>
            </Link>

            <Link
              href="/dashboard/grupos/novo"
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent transition-all"
            >
              <FolderOpen className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="font-bold">Criar Grupo</span>
                <span className="text-xs text-muted-foreground">Organizar suas vendas</span>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}