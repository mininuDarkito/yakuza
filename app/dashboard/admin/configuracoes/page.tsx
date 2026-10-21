import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { getSettingsStatus, type SettingStatus } from "@/lib/settings"
import { SettingsForm } from "@/components/dashboard/admin/settings-form"
import { KeyRound, ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Configurações do Sistema | Yakuza Raw",
}

export default async function ConfiguracoesAdminPage() {
  const session = await getServerSession(authOptions)

  if (session?.user?.role !== "admin") {
    redirect("/dashboard")
  }

  let settings: SettingStatus[] = []
  let loadError = false

  try {
    settings = await getSettingsStatus()
  } catch (error) {
    console.error("[ADMIN_CONFIGURACOES] Erro ao carregar configurações:", error)
    loadError = true
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-4xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="bg-primary p-3 rounded-2xl text-primary-foreground shadow-xl shadow-primary/20">
          <KeyRound className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
            Configurações
          </h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
            Credenciais e integrações guardadas no banco de dados
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-start gap-4 rounded-[2rem] border border-red-500/30 bg-red-500/5 p-6">
          <ShieldAlert className="h-6 w-6 shrink-0 text-red-400" />
          <div className="space-y-1">
            <p className="font-black uppercase italic text-sm text-red-300">
              Não foi possível carregar as configurações
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Verifique a conexão com o banco (<code>DATABASE_URL</code>) e se o{" "}
              <code>NEXTAUTH_SECRET</code> está definido no .env. Detalhes nos logs do servidor.
            </p>
          </div>
        </div>
      ) : (
        <SettingsForm initial={settings} />
      )}
    </div>
  )
}
