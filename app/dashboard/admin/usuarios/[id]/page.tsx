import { sql } from "@/lib/db"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Wallet, ShoppingBag, ArrowLeft, Calendar,
  TrendingUp, ShieldAlert, Award, Star, UserX
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic";

export default async function UserDetailsPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ page?: string }> }) {
  const params = await props.params;
  const userId = params.id;
  const searchParams = await props.searchParams;

  // Configuração da Paginação
  const currentPage = Number(searchParams.page) || 1;
  const itemsPerPage = 15;
  const offset = (currentPage - 1) * itemsPerPage;

  // 1. BUSCA DADOS DO USUÁRIO E TOTAIS GERAIS
  const userRes = await sql.query(`
    SELECT *, 
      (SELECT COALESCE(SUM(preco_total), 0) FROM vendas WHERE user_id = $1) as gmv_total,
      (SELECT COUNT(*) FROM vendas WHERE user_id = $1) as total_vendas
    FROM users WHERE id = $1
  `, [userId])

  const user = userRes.rows[0]
  if (!user) return notFound();

  // 2. PERFORMANCE POR PRODUTO (TOP 5)
  const topProductsRes = await sql.query(`
    SELECT p.nome, COUNT(v.id)::int as qtd, SUM(v.preco_total) as receita
    FROM vendas v
    JOIN produtos p ON v.produto_id = p.id
    WHERE v.user_id = $1
    GROUP BY p.nome
    ORDER BY qtd DESC
    LIMIT 5
  `, [userId])

  // 3. FATURAMENTO POR MÊS (RESPEITANDO DATA_VENDA)
  const monthlyRes = await sql.query(`
    SELECT 
      TO_CHAR(data_venda, 'MM') as mes_index,
      TO_CHAR(data_venda, 'Mon') as mes_nome,
      SUM(preco_total) as total
    FROM vendas
    WHERE user_id = $1 AND data_venda >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY mes_index, mes_nome
    ORDER BY mes_index ASC
  `, [userId])

  // 4. ÚLTIMAS VENDAS COM PAGINAÇÃO
  const salesRes = await sql.query(`
    SELECT v.*, p.nome as produto_nome
    FROM vendas v
    LEFT JOIN produtos p ON v.produto_id = p.id
    WHERE v.user_id = $1
    ORDER BY v.data_venda DESC
    LIMIT $2 OFFSET $3
  `, [userId, itemsPerPage, offset]);

  // Busca o total para saber quantas páginas existem
  const totalSalesRes = await sql.query(
    "SELECT COUNT(*)::int FROM vendas WHERE user_id = $1", 
    [userId]
  );
  const totalPages = Math.ceil(totalSalesRes.rows[0].count / itemsPerPage);

  const billing = user.billing_setup || {}

  return (
    <AdminGate>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <Link href="/dashboard/admin" className="group text-[10px] font-black flex items-center gap-2 hover:text-primary transition-colors uppercase italic tracking-widest text-zinc-500">
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Painel Yakuza
        </Link>

        {/* HEADER PERFIL */}
        <div className="flex flex-col md:flex-row items-center gap-8 bg-zinc-950 p-10 rounded-[2rem] text-white shadow-2xl border-b-8 border-primary relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-5">
            <TrendingUp className="h-64 w-64" />
          </div>

          <Avatar className="h-28 w-28 border-4 border-primary/30 shadow-2xl">
            <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`} />
            <AvatarFallback className="text-3xl font-black bg-primary/20 text-primary uppercase">
              {user.discord_username?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">{user.discord_username}</h1>
              <Badge className="bg-primary text-primary-foreground font-black px-3 py-1 uppercase italic h-fit">
                {user.role}
              </Badge>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase opacity-50 mb-1">Faturamento Bruto</p>
                <p className="text-xl font-black text-emerald-400 italic leading-none font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.gmv_total)}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-sm text-center">
                <p className="text-[9px] font-black uppercase opacity-50 mb-1">Vendas Totais</p>
                <p className="text-xl font-black text-white italic leading-none">{user.total_vendas}</p>
              </div>
            </div>
          </div>

          {/* AÇÕES RÁPIDAS DE ADMIN */}
          <div className="z-10 flex flex-col gap-2">
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[9px] font-black uppercase italic hover:bg-primary hover:text-white transition-all">
              <ShieldAlert className="h-3 w-3 mr-2" /> Alterar para Admin
            </Button>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-[9px] font-black uppercase italic hover:bg-red-600 hover:text-white transition-all">
              <UserX className="h-3 w-3 mr-2" /> Banir Vendedor
            </Button>
          </div>
        </div>

        {/* PERFORMANCE MENSAL */}
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-primary">
            <Calendar className="h-5 w-5" /> Ciclo de Performance ({new Date().getFullYear()})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {monthlyRes.rows.map((m) => (
              <Card key={m.mes_index} className="border-2 border-white/5 bg-zinc-900/30">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">{m.mes_nome}</p>
                  <p className="text-sm font-black text-primary italic leading-none font-mono">
                    $ {Number(m.total).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* RANKING INTERNO DE PRODUTOS */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" /> Séries com maior venda de Raw
            </h2>
            <div className="space-y-3">
              {topProductsRes.rows.map((p, i) => (
                <div key={i} className="bg-zinc-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black italic text-zinc-800 group-hover:text-primary/20">#0{i + 1}</span>
                    <p className="text-[10px] font-black uppercase italic leading-tight max-w-[120px]">{p.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-500 italic">{p.qtd} UN</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase font-mono">$ {p.receita}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DADOS DE PAGAMENTO */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Gateway de Pagamento (PIX)
            </h2>
            <Card className="bg-zinc-950 border-white/5 overflow-hidden">
              <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Titular da Conta</p>
                    <p className="text-sm font-black uppercase italic">{billing.nome_beneficiario || "NÃO CADASTRADO"}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Tipo de Identificador</p>
                    <p className="text-sm font-black uppercase italic">{billing.tipo_chave || "N/A"}</p>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-3 bg-primary/5 p-6 rounded-3xl border border-primary/20">
                  <p className="text-[10px] font-black text-primary uppercase text-center">Chave Destinatária Ativa</p>
                  <div className="text-center font-mono text-sm font-black break-all select-all">
                    {billing.chave_pix || "AGUARDANDO CONFIGURAÇÃO"}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* HISTÓRICO DE VENDAS */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" /> Histórico de vendas recentes
                </h2>
                <span className="text-[10px] font-black text-zinc-500 uppercase">
                  Página {currentPage} de {totalPages || 1}
                </span>
              </div>

              <div className="rounded-2xl border border-white/5 overflow-hidden bg-zinc-950 shadow-2xl">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest italic">Item de Venda</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest italic text-right">Montante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesRes.rows.map((v) => (
                      <TableRow key={v.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <p className="font-black text-[11px] uppercase italic text-zinc-200">{v.produto_nome}</p>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase italic mt-0.5">
                            {new Date(v.data_venda).toLocaleDateString('pt-BR')} • {new Date(v.data_venda).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-mono font-black text-emerald-500 text-sm">$ {v.preco_total}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* CONTROLES DE PAGINAÇÃO (NAVPAGE) */}
                <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    asChild={currentPage > 1}
                    className="h-8 text-[10px] font-black uppercase italic border-white/10"
                  >
                    {currentPage > 1 ? (
                      <Link href={`?page=${currentPage - 1}`}>Anterior</Link>
                    ) : (
                      <span>Anterior</span>
                    )}
                  </Button>

                  {/* Números das páginas */}
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <Button
                        key={n}
                        variant={currentPage === n ? "default" : "outline"}
                        size="sm"
                        asChild
                        className={cn(
                          "h-8 w-8 text-[10px] font-black transition-all",
                          currentPage === n ? "bg-primary border-none shadow-lg shadow-primary/20" : "border-white/10"
                        )}
                      >
                        <Link href={`?page=${n}`}>{n}</Link>
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    asChild={currentPage < totalPages}
                    className="h-8 text-[10px] font-black uppercase italic border-white/10"
                  >
                    {currentPage < totalPages ? (
                      <Link href={`?page=${currentPage + 1}`}>Próximo</Link>
                    ) : (
                      <span>Próximo</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGate>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  )
}