import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { VendasList } from "@/components/dashboard/vendas/vendas-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function VendasPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return <div>Acesso negado. Por favor, faça login.</div>
  }


  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
          <p>
            Acompanhe os capítulos registrados e faturamento por grupo.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vendas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Venda
          </Link>
        </Button>
      </div>

      {/* DICA: No seu componente VendasList, lembre-se de renomear 
        o rótulo da coluna "Quantidade" para "Capítulo" 
      */}
      <VendasList userId={userId} initialAno="2026" initialMes="3"/>
    </div>
  )
}