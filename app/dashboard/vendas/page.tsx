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


  const now = new Date()
  const currentMonth = String(now.getMonth() + 1)
  const currentYear = String(now.getFullYear())

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-black uppercase italic">Histórico de Vendas</h1>
          <p className="text-zinc-500 font-bold italic text-sm">
            Acompanhe os capítulos registrados e faturamento por grupo.
          </p>
        </div>
        <Button asChild className="bg-primary text-black font-black uppercase italic rounded-xl px-6">
          <Link href="/dashboard/vendas/nova">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Venda
          </Link>
        </Button>
      </div>

      <VendasList userId={userId} initialAno={currentYear} initialMes={currentMonth}/>
    </div>
  )
}