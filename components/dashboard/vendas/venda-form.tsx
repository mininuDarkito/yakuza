"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ImagePlus, Loader2, Info, CheckCircle2, Badge } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

const formSchema = z.object({
  grupo_id: z.string().min(1, "Selecione um grupo"),
  produto_id: z.string().min(1, "Selecione uma série"),
  capitulo_raw: z.string().min(1, "Informe o capítulo ou intervalo"),
  preco_unitario: z.string().min(1, "Preço é obrigatório"),
  observacoes: z.string().optional(),
  data_venda: z.date().optional(),
})

type FormData = z.infer<typeof formSchema>

interface Grupo { id: string; nome: string }
interface Produto { 
  id: string; 
  nome: string; 
  preco: string | number; 
  grupo_id: string;
  imagem_url?: string | null;
  plataforma: string | null;
}

export function VendaForm({ grupos, produtos, initialProdutoId }: { grupos: Grupo[], produtos: Produto[], initialProdutoId?: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grupo_id: "",
      produto_id: initialProdutoId || "",
      capitulo_raw: "1",
      preco_unitario: "",
      observacoes: "",
      data_venda: new Date(),
    },
  })

  useEffect(() => {
    // Se vier pelo catálogo, procuramos o vínculo (us.id)
    const p = produtos.find(prod => prod.id === initialProdutoId || prod.nome === initialProdutoId)
    if (p) {
      form.setValue("produto_id", p.id)
      form.setValue("preco_unitario", String(p.preco).replace(".", ","))
      form.setValue("grupo_id", p.grupo_id)
    }
  }, [initialProdutoId, produtos, form])

  const selectedProdutoId = form.watch("produto_id")
  const capituloRaw = form.watch("capitulo_raw")
  const precoUnitario = form.watch("preco_unitario")

  const selectedProduto = useMemo(() => 
    produtos.find((p) => p.id === selectedProdutoId), 
  [selectedProdutoId, produtos])

  const calculoCapitulos = useMemo(() => {
    if (!capituloRaw) return { totalItens: 0, lista: [] }
    if (capituloRaw.includes("-")) {
      const parts = capituloRaw.split("-")
      const inicio = parseFloat(parts[0]?.trim()), fim = parseFloat(parts[1]?.trim())
      if (isNaN(inicio) || isNaN(fim) || inicio > fim) return { totalItens: 0, lista: [] }
      const lista = []; for (let i = inicio; i <= fim; i++) lista.push(i)
      return { totalItens: lista.length, lista }
    }
    const cap = parseFloat(capituloRaw.trim())
    return isNaN(cap) ? { totalItens: 0, lista: [] } : { totalItens: 1, lista: [cap] }
  }, [capituloRaw])

  const totalGeral = useMemo(() => {
    const preco = parseFloat(precoUnitario?.replace(",", ".")) || 0
    return calculoCapitulos.totalItens * preco
  }, [calculoCapitulos, precoUnitario])

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: selectedProduto?.id, // ID da user_series
          capitulos: calculoCapitulos.lista,
          preco_unitario: parseFloat(data.preco_unitario.replace(",", ".")),
          grupo_id: data.grupo_id,
          data_venda: data.data_venda?.toISOString(),
          observacoes: data.observacoes
        }),
      })

      if (!response.ok) throw new Error("Erro ao registrar venda")
      toast.success("Venda registrada com sucesso!")
      router.push("/dashboard/vendas")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-2 border-white/5 bg-zinc-950 shadow-2xl overflow-hidden rounded-[2.5rem]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="pt-10 space-y-10">
            
            <div className="flex flex-col sm:flex-row gap-10 items-center sm:items-start">
              <div className="relative h-72 w-48 shrink-0 overflow-hidden rounded-[2rem] border-4 border-white/5 shadow-2xl bg-black ring-1 ring-white/10 group">
                {selectedProduto?.imagem_url ? (
                  <img src={selectedProduto.imagem_url} className="h-full w-full object-cover transition-transform group-hover:scale-110 duration-500" alt="Capa" />
                ) : (
                  <div className="flex h-full items-center justify-center opacity-20"><ImagePlus size={40} /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                   <p className="text-[10px] font-black text-primary uppercase italic tracking-widest">Preview</p>
                </div>
              </div>

              <div className="flex-1 w-full space-y-6">
                <FormField
                  control={form.control}
                  name="produto_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">Obra Selecionada</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val)
                          const p = produtos.find(prod => prod.id === val)
                          if (p) {
                            form.setValue("preco_unitario", String(p.preco).replace(".", ","))
                            form.setValue("grupo_id", p.grupo_id)
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-16 text-xl font-black bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary">
                            <SelectValue placeholder="Escolha a série..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          {produtos.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="py-3 text-lg font-bold uppercase italic focus:bg-primary">
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grupo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">Canal de Registro</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 font-black italic uppercase h-12 rounded-xl">
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          {grupos.map((g) => (
                            <SelectItem key={g.id} value={g.id} className="font-bold uppercase italic">{g.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 rounded-[2rem] bg-white/[0.02] border-2 border-white/5 border-dashed">
              <FormField
                control={form.control}
                name="capitulo_raw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-zinc-500 italic">Capítulo / Lote</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 10 ou 10-15" {...field} className="h-14 font-mono text-2xl font-black bg-black/40 border-white/5 focus:border-primary" />
                    </FormControl>
                    <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-zinc-600 uppercase italic">
                       <Info size={12} /> Use "-" para registrar múltiplos
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_unitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-zinc-500 italic">Preço Unitário</FormLabel>
                    <FormControl>
                      <Input placeholder="0,00" {...field} className="h-14 text-2xl font-black text-emerald-400 bg-black/40 border-white/5 focus:border-emerald-500" onChange={(e) => field.onChange(e.target.value.replace(/[^\d,]/g, ""))} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {totalGeral > 0 && (
              <div className="flex items-center justify-between p-8 bg-primary rounded-[2rem] text-black shadow-[0_20px_50px_rgba(0,0,0,0.5)] transform transition-all animate-in slide-in-from-bottom-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Total a Receber</p>
                  <p className="text-5xl font-black tracking-tighter">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(totalGeral)}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <Badge className="bg-black text-white px-4 py-1 text-[10px] font-black uppercase italic rounded-full mb-2">
                    {calculoCapitulos.totalItens} CAPÍTULOS
                  </Badge>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40 italic">Checkout Seguro</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="data_venda"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Data da Venda</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full h-12 bg-white/5 border-white/10 rounded-xl font-bold italic", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-zinc-900 border-white/10" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} locale={ptBR} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Opcional..." {...field} className="h-12 min-h-[48px] bg-white/5 border-white/10 rounded-xl font-bold text-xs" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="p-10 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
            <Button variant="ghost" asChild className="text-zinc-500 font-black uppercase italic text-[10px] tracking-widest">
              <Link href="/dashboard/vendas">Descartar</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || totalGeral === 0} 
              className="px-12 h-16 text-xl font-black uppercase italic tracking-tighter bg-primary text-black rounded-2xl shadow-2xl hover:scale-105 transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2 h-6 w-6" /> Finalizar Registro</>}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}