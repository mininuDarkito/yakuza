"use client"

import { Card, CardContent } from "@/components/ui/card"
import { 
  Calculator, 
  Hash, 
  Zap, 
  Info,
  CheckCircle2
} from "lucide-react"

export function MiniGuia() {
  return (
    <Card className="border-2 border-primary/10 bg-primary/5 rounded-[2rem] overflow-hidden backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Info size={18} />
          </div>
          <h4 className="font-black uppercase italic tracking-tighter text-sm">
            Guia de <span className="text-primary">Lançamento</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DICA 01: CAPÍTULOS */}
          <div className="flex gap-3">
            <Hash className="text-primary shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase italic text-foreground">Formato de Capítulos</p>
              <p className="text-[9px] font-bold text-muted-foreground leading-relaxed uppercase italic">
                <span className="text-primary">1-5:</span> Intervalo (1, 2, 3, 4, 5)<br />
                <span className="text-primary">1,3,5:</span> Individual (Não linear)<br />
                <span className="text-primary">1:</span> Capítulo único
              </p>
            </div>
          </div>

          {/* DICA 02: CÁLCULO */}
          <div className="flex gap-3">
            <Calculator className="text-primary shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase italic text-foreground">Cálculo Automático</p>
              <p className="text-[9px] font-bold text-muted-foreground leading-relaxed uppercase italic">
                O campo <span className="text-primary">Total a Receber</span> multiplica o preço pela quantidade de capítulos identificados no campo acima.
              </p>
            </div>
          </div>

          {/* DICA 03: VÍNCULO */}
          <div className="flex gap-3">
            <Zap className="text-primary shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase italic text-foreground">Vínculo Rápido</p>
              <p className="text-[9px] font-bold text-muted-foreground leading-relaxed uppercase italic">
                Se a obra não estiver na sua lista, use a <span className="text-primary">Galeria</span> para importar do catálogo global instantaneamente.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-center gap-2">
            <CheckCircle2 size={12} className="text-primary" />
            <span className="text-[8px] font-black uppercase italic tracking-[0.2em] text-muted-foreground">
                Yakuza Raws • Sistema de Automação Financeira v3.0
            </span>
        </div>
      </CardContent>
    </Card>
  )
}