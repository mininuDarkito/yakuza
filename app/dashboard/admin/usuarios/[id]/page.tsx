import { UserHeader } from "@/components/dashboard/UserHeader"
import { PerformanceCycle } from "@/components/dashboard/PerformanceCycle"
import { AdminGate } from "@/components/dashboard/admin/admin-gate"
import { Card, CardContent } from "@/components/ui/card"
import { Wallet, ArrowLeft, Award } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"

export const dynamic = "force-dynamic";

export default async function UserDetailsPage(props: { 
  params: Promise<{ id: string }>, 
  searchParams: Promise<{ page?: string }> 
}) {
  const params = await props.params;
  const userId = params.id;

  // 1. BUSCA DADOS VIA API 
  // Note o caminho: /api/admin/user/${userId} (conforme sua foto do VS Code)
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const reqHeaders = await headers();
const cookie = reqHeaders.get("cookie");

const res = await fetch(`${baseUrl}/api/admin/user/${userId}`, {
    headers: {
        "cookie": cookie || "", // Repassa apenas a sessão
    },
    next: { revalidate: 0 }
});
  if (!res.ok) {
    console.error("Erro na busca da API:", res.status);
    return notFound();
  }
  
  const data = await res.json();
  const { user, ranking } = data;
  const billing = user.billing_setup || {};

  return (
    <AdminGate>
      <UserHeader user={user} viewMode="admin" />
      
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <Link href="/dashboard/admin" className="group text-[10px] font-black flex items-center gap-2 hover:text-primary transition-colors uppercase italic tracking-widest text-zinc-500">
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Painel Yakuza
        </Link>

        <PerformanceCycle userId={userId} viewMode="admin" />

        <div className="grid gap-8 lg:grid-cols-12">
          {/* RANKING */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" /> Séries com maior venda
            </h2>
            <div className="space-y-3">
              {ranking?.map((p: any, i: number) => (
                <div key={i} className="bg-zinc-950 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black italic text-zinc-800 group-hover:text-primary/20">#0{i + 1}</span>
                    <p className="text-[10px] font-black uppercase italic leading-tight max-w-[120px]">{p.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-500 italic">{p.qtd} UN</p>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase font-mono">$ {Number(p.receita).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GATEWAY PIX */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> Gateway de Pagamento (PIX)
            </h2>
            <Card className="bg-zinc-950 border-white/5 overflow-hidden">
              <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Titular da Conta</p>
                    <p className="text-sm font-black uppercase italic">{billing.nome_beneficiario || "NÃO CADASTRADO"}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Tipo de Identificador</p>
                    <p className="text-sm font-black uppercase italic">{billing.tipo_chave || "N/A"}</p>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-3 bg-primary/5 p-6 rounded-3xl border border-primary/20">
                  <p className="text-[10px] font-black text-primary uppercase text-center italic">Chave Destinatária Ativa</p>
                  <div className="text-center font-mono text-sm font-black break-all select-all">
                    {billing.chave_pix || "AGUARDANDO CONFIGURAÇÃO"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGate>
  )
}