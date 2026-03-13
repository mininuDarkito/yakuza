import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { BillingForm } from "./billing-form"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, ShieldCheck, Settings2 } from "lucide-react"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"


export default async function ConfigPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const banner = session?.user?.discordBanner;

  // 1. BUSCA DADOS DO USUÁRIO E TOTAIS GERAIS
  const userRes = await sql.query(`
      SELECT *, 
        (SELECT COALESCE(SUM(preco_total), 0) FROM vendas WHERE user_id = $1) as gmv_total,
        (SELECT COUNT(*) FROM vendas WHERE user_id = $1) as total_vendas
      FROM users WHERE id = $1
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

  const user = userRes.rows[0]
  if (!user) return notFound();

  // Busca os dados atuais do banco para preencher o formulário
  const res = await sql.query(
    `SELECT billing_setup FROM users WHERE id = $1`,
    [userId]
  )

  const initialData = res.rows[0]?.billing_setup

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl">
          <Settings2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Minha Conta</h1>
          <p className="text-muted-foreground font-medium"> gerencie suas preferências e dados de faturamento.</p>

        </div>
      </div>

      {/* HEADER PERFIL */}
      <div
        className={cn(
          "flex flex-col md:flex-row items-center gap-8 p-10 rounded-[2rem] text-primary shadow-2xl border-b-8 border-primary relative overflow-hidden",
          !banner && "bg-zinc-950" // Só aplica o fundo sólido se não houver banner
        )}
        style={
          banner
            ? {
              backgroundImage: `linear-gradient(rgba(9, 9, 11, 0.8), rgba(9, 9, 11, 0.8)), url(${banner})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
            : {}
        }
      >
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
                  R$ {Number(m.total).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>




      <div className="grid gap-8">
        {/* Formulário de Billing */}
        <BillingForm initialData={initialData} />

        {/* Card de Informação de Segurança */}
        <div className="bg-zinc-950 p-6 rounded-2xl text-white flex items-start gap-4 shadow-xl">
          <ShieldCheck className="h-6 w-6 text-emerald-400 mt-1" />
          <div className="space-y-1">
            <p className="font-bold text-sm uppercase">Dados Protegidos</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Suas informações de recebimento são criptografadas e usadas apenas para gerar
              os comprovantes de venda para seus clientes. O Admin da plataforma monitora
              alterações para garantir a segurança de todos.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}