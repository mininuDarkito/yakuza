import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ShieldCheck, Settings2, Zap } from "lucide-react"
import { notFound } from "next/navigation"
import { UserHeader } from "@/components/dashboard/UserHeader"
import { PerformanceCycle } from "@/components/dashboard/PerformanceCycle"
import { headers } from "next/headers"
import { PaymentGateway } from "@/components/dashboard/PaymentGateway"
import { EditVendasAdmin } from "@/components/dashboard/admin/EditVendasAdmin"

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return notFound();

  // 1. Preparação de Headers para Fetch Interno
  const requestHeaders = await headers();
  const safeHeaders = new Headers(requestHeaders);
  safeHeaders.delete("connection");
  safeHeaders.delete("keep-alive");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // 2. Busca Dados do Perfil (GMV, Banner, etc)
  const userRes = await fetch(`${baseUrl}/api/admin/user/${userId}`, {
    headers: safeHeaders, 
    next: { revalidate: 0 }
  });

  // 3. Busca Grupos do Usuário (Para o seletor do EditVendas)
  const gruposRes = await fetch(`${baseUrl}/api/admin/grupos?userId=${userId}`, {
    headers: safeHeaders,
    next: { revalidate: 0 }
  });

  if (!userRes.ok) return notFound();

  const { user } = await userRes.json();
  const grupos = gruposRes.ok ? await gruposRes.json() : [];

  // 4. Formata o usuário para o componente (Apenas ele mesmo)
  const usuarioLogado = [{
    id: user.id,
    discord_username: user.discord_username
  }];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20 shadow-[0_0_15px_rgba(204,255,0,0.1)]">
          <Settings2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Minha Conta</h1>
          <p className="text-muted-foreground font-medium text-xs uppercase tracking-wider"> 
            Gerencie suas preferências e dados de faturamento.
          </p>
        </div>
      </div>

      {/* BANNER E STATUS */}
      <UserHeader user={user} viewMode="user" />

      {/* GRÁFICOS E MÉTRICAS MENSAL */}
      <PerformanceCycle userId={userId} viewMode="user" />

      {/* CONFIGURAÇÃO DE PIX / RECEBIMENTO */}
      <PaymentGateway userId={userId} initialData={user.billing_setup} viewMode="user" />

      {/* AUDITORIA E EDIÇÃO DE LANÇAMENTOS (VISÃO INDIVIDUAL) */}
      <div className="space-y-4">
         <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" /> Gestão de Lançamentos
         </h2>
         <EditVendasAdmin 
            usuarios={usuarioLogado} 
            grupos={grupos} 
            key={userId} 
         />
      </div>

      {/* CARD DE SEGURANÇA E INFO */}
      <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 text-white flex items-start gap-4 shadow-2xl">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
        </div>
        <div className="space-y-1">
          <p className="font-black text-xs uppercase italic tracking-widest text-emerald-400">Ambiente Seguro</p>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
            Suas vendas são auditadas mensalmente. Lançamentos sem grupo devem ser corrigidos para garantir o seu faturamento. 
            Registros selados (Master Lock) não permitem edição.
          </p>
        </div>
      </div>
      
    </div>
  )
}