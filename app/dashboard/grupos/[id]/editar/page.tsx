import { getServerSession } from "next-auth"
import { notFound, redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { GrupoForm } from "@/components/dashboard/grupos/grupo-form"

export default async function EditarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params

  // Segurança: Só Admins podem editar grupos globais
  if (session?.user?.role !== 'admin') {
    redirect("/dashboard/grupos")
  }

  const res = await sql.query(
    "SELECT * FROM grupos WHERE id = $1",
    [id]
  )

  const grupo = res.rows[0]

  if (!grupo) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          Editar <span className="text-primary">Grupo Global</span>
        </h1>
        <p className="text-zinc-500 font-bold italic text-xs uppercase tracking-widest mt-1">
          Modificando: <span className="text-zinc-300">{grupo.nome}</span>
        </p>
      </div>

      <div className="max-w-3xl">
        <GrupoForm grupo={grupo} />
      </div>
    </div>
  )
}