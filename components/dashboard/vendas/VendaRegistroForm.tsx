"use client"

import { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search, Image as ImageIcon, Calendar, X, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { GaleriaObrasModal } from "./galeria-obras-modal"
import { MiniGuia } from "./mini-guia"

const vendaSchema = z.object({
  obra_id: z.string().min(1, "Selecione uma obra"),
  grupo_id: z.string().min(1, "Selecione o grupo"),
  capitulos: z.string().min(1, "Informe os capítulos"),
  preco_unitario: z.string().min(1, "Informe o preço"),
  data_venda: z.string().min(1, "Selecione a data"),
  obs: z.string().optional(),
})

type VendaFormData = z.infer<typeof vendaSchema>

export function VendaRegistroForm({ grupos, obrasVinculadas, initialProdutoId }: any) {
  const router = useRouter()
  const [selectedObra, setSelectedObra] = useState<any>(null)
  const [showGaleria, setShowGaleria] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [quickSearch, setQuickSearch] = useState("")

  const form = useForm<VendaFormData>({
    resolver: zodResolver(vendaSchema),
    defaultValues: {
      obra_id: "",
      grupo_id: "",
      capitulos: "",
      preco_unitario: "",
      data_venda: new Date().toISOString().split('T')[0],
      obs: ""
    }
  })

  // Efeito para auto-completar se vier produto_id via URL
  useEffect(() => {
    if (initialProdutoId && obrasVinculadas.length > 0) {
      const obra = obrasVinculadas.find((o: any) => o.produto_id === initialProdutoId);
      if (obra) {
        selecionarObra(obra);
      }
    }
  }, [initialProdutoId, obrasVinculadas]);

  // Filtro de pesquisa rápida local (obras que o usuário já tem)
  const obrasFiltradas = useMemo(() => {
    if (!quickSearch) return []
    return obrasVinculadas.filter((o: any) =>
      o.nome.toLowerCase().includes(quickSearch.toLowerCase())
    )
  }, [quickSearch, obrasVinculadas])

  // Cálculo do Total em Tempo Real
  const totalReceber = useMemo(() => {
    const caps = form.watch("capitulos")
    const preco = parseFloat(form.watch("preco_unitario").replace(",", ".")) || 0

    const countCaps = (str: string) => {
      if (!str) return 0
      const parts = str.split(/[ ,]+/)
      let total = 0
      parts.forEach(p => {
        if (p.includes("-")) {
          const [start, end] = p.split("-").map(Number)
          if (!isNaN(start) && !isNaN(end)) total += (Math.abs(end - start) + 1)
        } else if (p && !isNaN(Number(p))) total += 1
      })
      return total
    }
    return countCaps(caps) * preco
  }, [form.watch("capitulos"), form.watch("preco_unitario")])

  const onSubmit = async (data: VendaFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/user/venda/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          preco_unitario: parseFloat(data.preco_unitario.replace(",", "."))
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Erro ao registrar")

      toast.success(`${result.count} capítulos registrados na Yakuza!`)

      form.reset({
        ...data,
        capitulos: "",
        obs: ""
      })
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const selecionarObra = (obra: any) => {
    setSelectedObra(obra)
    form.setValue("obra_id", obra.produto_id || obra.id)
    if (obra.preco) form.setValue("preco_unitario", String(obra.preco).replace(".", ","))
    if (obra.grupo_id) form.setValue("grupo_id", obra.grupo_id)
    setQuickSearch("")
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card className="border-border bg-card rounded-[2.5rem] overflow-hidden shadow-2xl">
          <CardContent className="p-8 space-y-8">

            {/* SEÇÃO 01: BUSCA E CAPA */}
            <div className="flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-48 aspect-[3/4] bg-muted rounded-[2rem] overflow-hidden border-2 border-border relative">
                {selectedObra?.imagem_url ? (
                  <img src={selectedObra.imagem_url} className="w-full h-full object-cover animate-in fade-in" alt="Capa" />
                ) : (
                  <div className="flex items-center justify-center h-full opacity-20"><ImageIcon size={48} /></div>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="PESQUISAR MINHAS SÉRIES..."
                      className="pl-10 h-12 rounded-xl bg-muted/20 border-border font-bold italic uppercase"
                      value={quickSearch}
                      onChange={(e) => setQuickSearch(e.target.value)}
                    />
                    {obrasFiltradas.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {obrasFiltradas.map((o: any) => (
                          <button
                            key={o.vinculo_id}
                            type="button"
                            onClick={() => selecionarObra(o)}
                            className="w-full text-left p-3 hover:bg-primary/10 font-bold text-xs uppercase italic transition-colors"
                          >
                            {o.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => setShowGaleria(true)}
                    variant="outline"
                    className="h-12 w-12 rounded-xl border-primary/20 hover:bg-primary/10 bg-primary/5"
                  >
                    <ImageIcon className="text-primary" size={20} />
                  </Button>
                </div>

                {/* CAMPO: TÍTULO ORIGINAL */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase italic text-muted-foreground ml-2">Título Original</label>
                  <Input
                    placeholder="TÍTULO DA OBRA"
                    readOnly
                    className="h-12 bg-muted/30 opacity-80 font-black italic uppercase text-primary border-primary/10"
                    value={selectedObra?.nome || ""}
                  />
                </div>

                {/* CAMPO: NOME ALTERNATIVO */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase italic text-muted-foreground ml-2">Nome Alternativo</label>
                  <Input
                    placeholder="NOME ALTERNATIVO"
                    readOnly
                    className="h-12 bg-muted/30 opacity-60 font-bold italic uppercase"
                    value={selectedObra?.nome_alternativo || ""}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="grupo_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border font-bold italic uppercase">
                            <SelectValue placeholder="ALTERAR GRUPO DE VENDA" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="z-[120]">
                          {grupos.map((g: any) => (
                            <SelectItem key={g.id} value={g.id} className="font-bold uppercase italic cursor-pointer">
                              {g.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* SEÇÃO 02: SINOPSE */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic text-muted-foreground ml-4">Sinopse da Obra</label>
              <Textarea
                readOnly
                className="min-h-[80px] rounded-[1.5rem] bg-muted/20 border-border opacity-70 italic text-xs resize-none"
                value={selectedObra?.descricao || "Selecione uma obra para ver os detalhes..."}
              />
            </div>

            {/* SEÇÃO 03: LANÇAMENTO FINANCEIRO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="capitulos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase italic text-muted-foreground ml-2 text-primary">Capítulos</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1-5 ou 1,2,4" className="h-12 font-bold rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preco_unitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase italic text-muted-foreground ml-2 text-primary">Preço Unit.</FormLabel>
                    <FormControl>
                      <Input placeholder="$ 0,00" className="h-12 font-bold rounded-xl text-emerald-500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="bg-primary/5 border-2 border-primary/20 p-3 rounded-2xl h-12 flex items-center justify-between px-4 shadow-inner">
                <span className="text-[10px] font-black uppercase text-primary italic">Total</span>
                <span className="font-black text-lg italic text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(totalReceber)}
                </span>
              </div>
            </div>

            {/* SEÇÃO 04: METADADOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <FormField
                control={form.control}
                name="data_venda"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input type="date" className="pl-10 h-12 rounded-xl font-bold" {...field} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="obs"
                render={({ field }) => (
                  <Input placeholder="OBSERVAÇÕES DO REGISTRO..." className="h-12 rounded-xl italic font-bold text-xs uppercase" {...field} />
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="bg-muted/10 p-6 flex justify-between items-center border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                form.reset();
                setSelectedObra(null);
                toast.info("Lançamento limpo.");
              }}
              className="font-black uppercase italic text-muted-foreground gap-2 hover:bg-muted/50 rounded-xl"
            >
              <X size={16} /> Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isLoading || !selectedObra}
              className="font-black uppercase italic bg-primary text-primary-foreground gap-2 px-8 rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check size={16} />}
              {isLoading ? "REGISTRANDO..." : "CONFIRMAR REGISTRO"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <MiniGuia />

      <GaleriaObrasModal
        isOpen={showGaleria}
        onClose={() => setShowGaleria(false)}
        onSelect={selecionarObra}
      />
    </Form>
  )
}