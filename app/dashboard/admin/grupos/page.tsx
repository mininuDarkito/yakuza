import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { GroupManager } from "@/components/dashboard/grupos/GroupManager"
import { ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Gerenciar Grupos | Yakuza Raws",
  description: "Gerenciamento completo de grupos, vendedores e vendas",
}

export default async function GerenciarGruposPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciar Grupos
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Administre grupos, vendedores e acompanhe as vendas com filtro por período
            </p>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <GroupManager />
    </div>
  )
}
