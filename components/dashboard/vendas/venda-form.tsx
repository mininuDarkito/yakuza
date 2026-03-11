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
import { CalendarIcon, ImagePlus, Loader2, Info } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import Link from "next/link"

const formSchema = z.object({
  grupo_id: z.string().min(1, "Selecione um grupo"),
  produto_id: z.string().min(1, "Selecione uma série"),
  capitulo_raw: z.string().min(1, "Informe o capítulo ou intervalo (ex: 10 ou 10-15)"),
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
}

interface VendaFormProps {
  grupos: Grupo[]
  produtos: Produto[]
  initialProdutoId?: string
}

export function VendaForm({ grupos, produtos, initialProdutoId }: VendaFormProps) {
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

  // Efeito para preencher automaticamente os dados se vier um ID inicial do catálogo
  useEffect(() => {
    if (initialProdutoId) {
      const p = produtos.find(prod => prod.id === initialProdutoId)
      if (p) {
        form.setValue("produto_id", p.id)
        form.setValue("preco_unitario", String(p.preco).replace(".", ","))
        form.setValue("grupo_id", p.grupo_id)
      }
    }
  }, [initialProdutoId, produtos, form])

  const selectedProdutoId = form.watch("produto_id")
  const capituloRaw = form.watch("capitulo_raw")
  const precoUnitario = form.watch("preco_unitario")

  const selectedProduto = useMemo(() => 
    produtos.find((p) => p.id === selectedProdutoId), 
  [selectedProdutoId, produtos])

  // Lógica de processamento do campo "Capítulo / Intervalo"
  const calculoCapitulos = useMemo(() => {
    if (!capituloRaw) return { totalItens: 0, lista: [] }
    
    if (capituloRaw.includes("-")) {
      const parts = capituloRaw.split("-")
      const inicio = parseInt(parts[0]?.trim())
      const fim = parseInt(parts[1]?.trim())
      
      if (isNaN(inicio) || isNaN(fim) || inicio > fim) return { totalItens: 0, lista: [] }
      
      const lista = []
      for (let i = inicio; i <= fim; i++) lista.push(i)
      return { totalItens: lista.length, lista }
    }
    
    const cap = parseInt(capituloRaw.trim())
    return isNaN(cap) ? { totalItens: 0, lista: [] } : { totalItens: 1, lista: [cap] }
  }, [capituloRaw])

  const totalGeral = useMemo(() => {
    const preco = parseFloat(precoUnitario?.replace(",", ".")) || 0
    return calculoCapitulos.totalItens * preco
  }, [calculoCapitulos, precoUnitario])

  const onSubmit = async (data: FormData) => {
    if (calculoCapitulos.totalItens === 0) {
      toast.error("Capítulo ou intervalo inválido")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: data.produto_id,
          capitulos: calculoCapitulos.lista,
          preco_unitario: parseFloat(data.preco_unitario.replace(",", ".")),
          observacoes: data.observacoes || undefined,
          data_venda: data.data_venda?.toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao registrar")
      }

      toast.success(`${calculoCapitulos.totalItens} capítulo(s) registrado(s)!`)
      router.push("/dashboard/vendas")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar venda")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl border-2 border-zinc-200 shadow-xl overflow-hidden bg-card">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="pt-8 space-y-8">
            
            {/* CABEÇALHO VISUAL: CAPA + SELEÇÃO */}
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
              <div className="relative h-64 w-44 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white shadow-2xl bg-zinc-100 ring-1 ring-zinc-200">
                {selectedProduto?.imagem_url ? (
                  <img 
                    src={selectedProduto.imagem_url} 
                    alt="Capa" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-300">
                    <ImagePlus className="h-12 w-12 opacity-20" />
                  </div>
                )}
                {selectedProduto && (
                   <div className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-md text-[10px] font-black uppercase italic shadow-lg">
                      Ativo
                   </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-6">
                <FormField
                  control={form.control}
                  name="produto_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase italic tracking-widest text-zinc-500">Série Selecionada</FormLabel>
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
                          <SelectTrigger className="h-14 text-xl font-black italic tracking-tighter border-2 focus:ring-primary">
                            <SelectValue placeholder="Escolha a série..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {produtos.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="py-3 text-lg font-bold uppercase italic">
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grupo_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase italic tracking-widest text-zinc-500">Grupo de Destino</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-2 font-bold uppercase italic h-11">
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grupos.map((g) => (
                            <SelectItem key={g.id} value={g.id} className="font-bold uppercase italic">{g.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* FINANCEIRO E CAPÍTULOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-zinc-50 border-2 border-zinc-100 border-dashed">
              <FormField
                control={form.control}
                name="capitulo_raw"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-zinc-400">Capítulo / Intervalo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 10 ou 10-15" {...field} className="h-12 font-mono text-xl font-black border-2 focus:border-primary" />
                    </FormControl>
                    <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-zinc-400 uppercase italic">
                       <Info className="h-3 w-3" /> Use "-" para registrar lote
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_unitario"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-black uppercase text-[10px] tracking-widest text-zinc-400">Preço p/ Capítulo (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0,00" 
                        {...field} 
                        className="h-12 text-xl font-black text-emerald-600 border-2 focus:border-emerald-500"
                        onChange={(e) => field.onChange(e.target.value.replace(/[^\d,]/g, ""))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* RESUMO DE REGISTROS DINÂMICO */}
            {totalGeral > 0 && (
              <div className="flex items-center justify-between p-6 bg-zinc-950 rounded-2xl text-white shadow-2xl transform transition-all animate-in zoom-in-95 duration-200">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Total a Receber</p>
                  <p className="text-4xl font-black italic tracking-tighter text-emerald-400">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalGeral)}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="bg-white/10 px-4 py-1 rounded-full text-[10px] font-black uppercase italic border border-white/10 mb-1">
                    {calculoCapitulos.totalItens} Item(ns)
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest italic">Nexus Billing v2</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="data_venda"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase italic tracking-widest text-zinc-500">Data do Registro</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button 
                            variant="outline" 
                            className={cn("w-full h-12 border-2 pl-3 text-left font-bold uppercase italic text-xs", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} locale={ptBR} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase italic tracking-widest text-zinc-500">Notas de Venda</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Opcional..." {...field} className="min-h-[48px] h-[48px] resize-none border-2 font-bold text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center border-t-2 border-zinc-100 p-8 mt-4 bg-zinc-50/50">
            <Button variant="ghost" asChild className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest hover:bg-transparent hover:text-zinc-600">
              <Link href="/dashboard/vendas">Cancelar</Link>
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || calculoCapitulos.totalItens === 0 || !selectedProdutoId} 
              className="px-12 h-14 text-xl font-black uppercase italic tracking-tighter shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] transition-all hover:translate-y-[-4px] active:scale-[0.98] active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Salvando...
                </>
              ) : (
                `Registrar ${calculoCapitulos.totalItens > 1 ? "em Lote" : "Venda"}`
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}