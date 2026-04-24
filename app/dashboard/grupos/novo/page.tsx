import { GrupoForm } from "@/components/dashboard/grupos/grupo-form"

export default function NovoGrupoPage() {
  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          Configurar <span className="text-primary">Novo Grupo</span>
        </h1>
        <p className="text-zinc-500 font-bold italic text-xs uppercase tracking-widest mt-1">
          Mapeie um canal do Discord para torná-lo um centro de vendas global.
        </p>
      </div>

      <div className="max-w-3xl">
        <GrupoForm />
      </div>
    </div>
  )
}