import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { BillingForm } from "./billing-form"
import { ShieldCheck, Settings2 } from "lucide-react"

export default async function ConfigPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

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
          <p className="text-muted-foreground font-medium">Gerencie suas preferências e dados de faturamento.</p>
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