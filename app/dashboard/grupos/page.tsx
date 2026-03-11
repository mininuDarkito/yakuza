import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { GruposList } from "@/components/dashboard/grupos/grupos-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function GruposPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground font-medium">Acesso negado. Por favor, faça login.</p>
      </div>
    )
  }

  // QUERY TURBINADA:
  // 1. Conta quantos produtos (user_series) o usuário tem vinculados a esse grupo.
  // 2. Soma o preco_total de todas as vendas vinculadas a esse grupo.
  const res = await sql.query(`
    SELECT 
      g.*, 
      (SELECT COUNT(*) FROM user_series us WHERE us.grupo_id = g.id AND us.user_id = $1) as produtos_count,
      COALESCE((SELECT SUM(v.preco_total) FROM vendas v WHERE v.grupo_id = g.id AND v.user_id = $1), 0) as faturamento_total
    FROM grupos g
    WHERE g.user_id = $1
    ORDER BY faturamento_total DESC, g.created_at DESC
  `, [userId])

  const grupos = res.rows

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-primary">
            Meus Grupos
          </h1>
          <p className="text-muted-foreground font-medium">
            Gerencie suas divisões de trabalho e acompanhe o desempenho de cada uma.
          </p>
        </div>
        
        <Button asChild className="font-bold shadow-lg transition-transform hover:scale-105">
          <Link href="/dashboard/grupos/novo">
            <Plus className="mr-2 h-5 w-5" />
            Novo Grupo
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* GruposList agora recebe o array com faturamento_total e produtos_count atualizados */}
        <GruposList grupos={grupos} />
      </div>
    </div>
  )
}