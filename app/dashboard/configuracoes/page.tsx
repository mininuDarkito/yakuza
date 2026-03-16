import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { BillingForm } from "./billing-form"
import { ShieldCheck, Settings2 } from "lucide-react"
import { notFound } from "next/navigation"
import { UserHeader } from "@/components/dashboard/UserHeader"
import { PerformanceCycle } from "@/components/dashboard/PerformanceCycle"
import { headers } from "next/headers"

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) return notFound();
// 1. Pega os headers originais
const requestHeaders = await headers();

// 2. Cria uma nova instância para manipular
const safeHeaders = new Headers(requestHeaders);

// 3. REMOVE os cabeçalhos que causam o erro de "invalid connection"
safeHeaders.delete("connection");
safeHeaders.delete("keep-alive");
// Opcional: safeHeaders.delete("host"); // Às vezes o host original causa conflito em Docker/Vercel

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

const res = await fetch(`${baseUrl}/api/admin/user/${userId}`, {
    headers: safeHeaders, 
    next: { revalidate: 0 }
});

  if (!res.ok) return notFound();

  const { user } = await res.json();
  const initialData = user.billing_setup || {};

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

      {/* COMPONENTE DE IDENTIDADE (BANNER) */}
      <UserHeader user={user} viewMode="user" />

      {/* CICLO DE PERFORMANCE (INDIVIDUAL) */}
      <PerformanceCycle userId={userId} viewMode="user" />

      <div className="grid gap-8">
        {/* FORMULÁRIO DE BILLING */}
        <BillingForm initialData={initialData} />

        {/* CARD DE SEGURANÇA */}
        <div className="bg-zinc-950 p-6 rounded-[2rem] border border-white/5 text-white flex items-start gap-4 shadow-2xl">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-xs uppercase italic tracking-widest text-emerald-400">Dados Protegidos</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
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