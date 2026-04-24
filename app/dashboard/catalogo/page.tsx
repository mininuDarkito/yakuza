import { ExplorarCatalogo } from "@/components/dashboard/produtos/ExplorarCatalogo"
// Importe outros componentes de layout se necessário (Breadcrumbs, PageHeader, etc.)

export default function ExplorarPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">
            Acervo Global
          </h2>
          <p className="text-muted-foreground font-bold italic uppercase text-[10px] tracking-widest">
            Selecione uma obra do catálogo da Yakuza Raws para vincular ao seu perfil.
          </p>
        </div>
      </div>
      
      {/* O componente é renderizado aqui */}
      <ExplorarCatalogo />
    </div>
  )
}