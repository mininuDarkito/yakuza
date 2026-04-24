import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ExportForm } from "@/components/dashboard/export/export-form"
import { redirect } from "next/navigation"

export default async function ExportarPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  // Verificação de segurança
  if (!userId) {
    redirect("/login")
  }

  // No driver 'pg' local, usamos o método .query e passamos o userId no array [$1]
  const res = await sql.query(
    'SELECT id, nome FROM grupos WHERE user_id = $1 ORDER BY nome',
    [userId]
  )

  // Extraímos os grupos das linhas (rows) do resultado
  const grupos = res.rows

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exportar Dados</h1>
        <p className="text-muted-foreground">
          Exporte seus dados em formato CSV
        </p>
      </div>

      {/* O formulário recebe a lista de grupos para filtrar o que será exportado */}
      <ExportForm grupos={grupos} />
    </div>
  )
}