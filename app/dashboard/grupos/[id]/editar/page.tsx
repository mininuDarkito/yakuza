import { getServerSession } from "next-auth"
import { notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { GrupoForm } from "@/components/dashboard/grupos/grupo-form"

export default async function EditarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id } = await params

  // Verificação de segurança
  if (!userId) {
    return <div>Acesso negado.</div>
  }

  // Usando o método .query para garantir compatibilidade com o seu driver 'pg'
  const res = await sql.query(
    "SELECT * FROM grupos WHERE id = $1 AND user_id = $2",
    [id, userId]
  )

  const grupo = res.rows[0]

  // Se o grupo não existir ou não pertencer ao usuário, 404
  if (!grupo) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editar Grupo</h1>
        <p className="text-muted-foreground">
          Atualize as informações do grupo: <strong>{grupo.nome}</strong>
        </p>
      </div>

      <GrupoForm grupo={grupo} />
    </div>
  )
}