"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectSeparator,
  SelectGroup
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, PlusCircle, Globe, X } from "lucide-react"
import { useRouter } from "next/navigation"

export function BulkSeriesForm() {
  const [loading, setLoading] = useState(false)
  const [seriesList, setSeriesList] = useState("")
  const [plataforma, setPlataforma] = useState("")
  const [novaPlataforma, setNovaPlataforma] = useState("")
  const [isCriandoNova, setIsCriandoNova] = useState(false)
  const [plataformasExistentes, setPlataformasExistentes] = useState<string[]>([])
  const router = useRouter()

  // Busca as plataformas que já estão em uso na tabela de produtos
  useEffect(() => {
    async function loadPlataformas() {
      try {
        const res = await fetch("/api/admin/plataformas")
        if (res.ok) {
          const data = await res.json()
          setPlataformasExistentes(data)
          if (data.length > 0) setPlataforma(data[0])
        }
      } catch (err) {
        console.error("Erro ao carregar plataformas")
      }
    }
    loadPlataformas()
  }, [])

  const handleBulkInsert = async () => {
    const nomes = seriesList.split(",").map(n => n.trim()).filter(n => n.length > 0)
    // Se estiver criando nova, usa o valor do input, senão o do select
    const plataformaFinal = isCriandoNova ? novaPlataforma.trim().toUpperCase() : plataforma

    if (nomes.length === 0) return toast.error("Digite ao menos um nome")
    if (!plataformaFinal) return toast.error("Defina a plataforma")

    setLoading(true)
    try {
      const res = await fetch("/api/admin/produtos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomes, plataforma: plataformaFinal }),
      })

      if (!res.ok) throw new Error()

      toast.success(`${nomes.length} séries registradas em ${plataformaFinal}!`)
      setSeriesList("")
      setNovaPlataforma("")
      setIsCriandoNova(false)
      router.refresh()
    } catch (err) {
      toast.error("Erro no processamento")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3 w-3" /> Plataforma de Origem
          </label>
          {isCriandoNova && (
            <button 
              onClick={() => setIsCriandoNova(false)}
              className="text-[10px] font-bold text-destructive flex items-center gap-1 hover:underline"
            >
              <X className="h-3 w-3" /> Cancelar
            </button>
          )}
        </div>
        
        {!isCriandoNova ? (
          <Select value={plataforma} onValueChange={(val) => {
            if (val === "criar_nova") {
              setIsCriandoNova(true)
            } else {
              setPlataforma(val)
            }
          }}>
            <SelectTrigger className="font-bold uppercase tracking-tighter bg-background border-2 h-11">
              <SelectValue placeholder="Selecione a plataforma..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {plataformasExistentes.map((plat) => (
                  <SelectItem key={plat} value={plat} className="font-bold uppercase italic">
                    {plat}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectSeparator />
              <SelectItem value="criar_nova" className="text-primary font-bold">
                + CADASTRAR NOVA PLATAFORMA
              </SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input 
            placeholder="Digite o nome da nova plataforma (ex: MANGADEX)" 
            className="font-bold uppercase border-primary ring-offset-background focus-visible:ring-primary h-11"
            value={novaPlataforma}
            onChange={(e) => setNovaPlataforma(e.target.value)}
            autoFocus
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Séries para {(isCriandoNova ? novaPlataforma : plataforma).toUpperCase() || "..."}
        </label>
        <Textarea 
          placeholder="Ex: Solo Leveling, One Piece, Kingdom..." 
          className="min-h-[160px] font-medium border-2 focus-visible:ring-primary bg-background/50"
          value={seriesList}
          onChange={(e) => setSeriesList(e.target.value)}
        />
      </div>

      <Button 
        onClick={handleBulkInsert} 
        disabled={loading || !seriesList || (isCriandoNova && !novaPlataforma)} 
        className="w-full font-black uppercase italic shadow-xl h-12"
      >
        {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
        Vincular Séries ao Catálogo
      </Button>
    </div>
  )
}