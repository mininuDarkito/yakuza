import { sql } from "@/lib/db"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Wallet, ShoppingBag, ArrowLeft, UserX, Calendar, TrendingUp } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic";

export default async function UserDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = params.id;

  // 1. BUSCA DADOS DO USUÁRIO E TOTAIS GERAIS
  let userRes;
  try {
    userRes = await sql.query(`
      SELECT *, 
        (SELECT COALESCE(SUM(preco_total), 0) FROM vendas WHERE user_id = $1) as gmv_total,
        (SELECT COUNT(*) FROM vendas WHERE user_id = $1) as total_vendas
      FROM users WHERE id = $1
    `, [userId])
  } catch (error) {
    return notFound();
  }

  const user = userRes.rows[0]
  if (!user) return notFound();

  // 2. BUSCA FATURAMENTO AGRUPADO POR MÊS (Jan, Fev, Mar...)
  const monthlyRes = await sql.query(`
    SELECT 
      TO_CHAR(created_at, 'MM') as mes_index,
      TO_CHAR(created_at, 'Mon') as mes_nome,
      SUM(preco_total) as total
    FROM vendas
    WHERE user_id = $1 AND created_at >= DATE_TRUNC('year', CURRENT_DATE)
    GROUP BY mes_index, mes_nome
    ORDER BY mes_index ASC
  `, [userId])

  // 3. BUSCA ÚLTIMAS 20 VENDAS COM NOME DO PRODUTO
  const salesRes = await sql.query(`
    SELECT v.*, p.nome as produto_nome
    FROM vendas v
    LEFT JOIN produtos p ON v.produto_id = p.id
    WHERE v.user_id = $1
    ORDER BY v.created_at DESC
    LIMIT 20
  `, [userId])

  const billing = user.billing_setup || {}

  return (
    <AdminGate>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* NAVEGAÇÃO */}
        <Link href="/dashboard/admin" className="group text-sm font-black flex items-center gap-2 hover:text-primary transition-colors uppercase italic tracking-widest">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          Voltar ao Painel de Controle
        </Link>

        {/* HEADER PERFIL */}
        <div className="flex flex-col md:flex-row items-center gap-8 bg-zinc-950 p-10 rounded-[2rem] text-white shadow-2xl border-b-8 border-primary relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-5">
            <TrendingUp className="h-64 w-64" />
          </div>

          <Avatar className="h-28 w-28 border-4 border-primary/30 shadow-2xl">
            <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.discord_avatar}.png`} />
            <AvatarFallback className="text-3xl font-black bg-primary/20 text-primary">
              {user.discord_username?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center md:text-left z-10">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter">{user.discord_username}</h1>
              <span  className="bg-primary text-primary-foreground text-[10px] font-black px-3 py-1 rounded-md uppercase italic self-center md:self-auto">
                {user.role} 
              </span>
            </div>
            <p className="text-zinc-500 font-mono text-xs mt-2 tracking-widest uppercase">UUID: {userId}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase opacity-50 mb-1">Faturamento Total</p>
                <p className="text-xl font-black text-emerald-400 italic leading-none">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(user.gmv_total)}
                </p>
              </div>
              <div className="bg-white/5 border  border-white/10 p-3 rounded-2xl backdrop-blur-sm">
                <p className="text-[9px] font-black uppercase opacity-50 mb-1">Capítulos Vendidos</p>
                <p className="text-xl font-black text-primary-foreground italic leading-none">{user.total_vendas}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE MENSAL (JAN, FEV, MAR...) */}
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Performance por Mês ({new Date().getFullYear()})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {monthlyRes.rows.length > 0 ? (
              monthlyRes.rows.map((m) => (
                <Card key={m.mes_index} className="border-2 shadow-sm bg-muted/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">{m.mes_nome}</p>
                    <p className="text-sm font-black text-primary italic">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.total)}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-8 border-2 border-dashed rounded-2xl flex items-center justify-center text-muted-foreground font-bold uppercase text-xs">
                Nenhum dado financeiro registrado este ano.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* DADOS PIX */}
          <Card className="border-2 shadow-xl overflow-hidden">
            <CardHeader className="bg-zinc-50 dark:bg-zinc-900 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Configuração de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Beneficiário</p>
                  <p className="font-bold text-sm uppercase italic">{billing.nome_beneficiario || "Pendente"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Tipo Chave</p>
                  <p className="font-bold text-sm uppercase">{billing.tipo_chave || "N/A"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-muted-foreground uppercase">Chave PIX Ativa</p>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-xl border-2 border-dashed font-mono text-xs font-bold text-primary break-all">
                  {billing.chave_pix || "Nenhuma chave configurada."}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HISTÓRICO DE VENDAS */}
          <div className="space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Vendas Recentes
            </h2>
            <div className="rounded-2xl border-2 shadow-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Série</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRes.rows.length > 0 ? (
                    salesRes.rows.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-black text-xs uppercase italic tracking-tight">{v.produto_nome}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">
                            {new Date(v.created_at).toLocaleDateString('pt-BR')} às {new Date(v.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </TableCell>
                        <TableCell className="text-right font-mono font-black text-emerald-600">
                          R$ {v.preco_total}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-10 italic text-muted-foreground font-bold uppercase text-xs">
                        Nenhuma venda encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </AdminGate>
  )
}