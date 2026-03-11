import { GrupoForm } from "@/components/dashboard/grupos/grupo-form"

export default function NovoGrupoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Novo Grupo</h1>
        <p className="text-muted-foreground">
          Crie um novo grupo para organizar seus produtos
        </p>
      </div>

      <GrupoForm />
    </div>
  )
}
