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
  const userRole = session?.user?.role

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground font-medium italic">Acesso negado. Faça login.</p>
      </div>
    )
  }

  // QUERY GLOBAL:
  // 1. Lista todos os grupos do sistema.
  // 2. produtos_count: Quantas obras O USUÁRIO configurou/trabalha nesse grupo.
  // 3. faturamento_total: Quanto O USUÁRIO vendeu nesse grupo específico.
  const res = await sql.query(`
    SELECT 
      g.*, 
      (SELECT COUNT(*) FROM user_series us WHERE us.grupo_id = g.id AND us.user_id = $1) as produtos_count,
      COALESCE((SELECT SUM(v.preco_total) FROM vendas v WHERE v.grupo_id = g.id AND v.user_id = $1), 0) as faturamento_total
    FROM grupos g
    ORDER BY faturamento_total DESC, g.nome ASC
  `, [userId])

  const grupos = res.rows

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white">
            Grupos <span className="text-primary text-2xl">Globais</span>
          </h1>
          <p className="text-zinc-500 font-bold italic text-xs uppercase tracking-widest">
            Acompanhe seu desempenho individual em cada setor da Scan.
          </p>
        </div>
        
        {/* Apenas Admins devem ver o botão de criar novo grupo global */}
        {userRole === 'admin' && (
          <Button asChild className="font-black uppercase italic bg-primary text-black hover:scale-105 transition-transform rounded-xl">
            <Link href="/dashboard/grupos/novo">
              <Plus className="mr-2 h-5 w-5" />
              Novo Grupo Global
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        <GruposList grupos={grupos} />
      </div>
    </div>
  )
}