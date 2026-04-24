"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2, Layers, BookOpen, Globe, 
  ExternalLink, Info, CheckCircle2, AlertCircle 
} from "lucide-react"

export function ProdutoForm({ produto, grupos }: { produto?: any, grupos: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [obraData, setObraData] = useState<any>(null)
  
  const predefProdutoId = searchParams.get("produtoId")

  const form = useForm<any>({
    defaultValues: {
      grupo_id: produto?.grupo_id || "",
      preco: produto?.preco ? String(produto.preco).replace(".", ",") : "",
    },
  })

  useEffect(() => {
    if (predefProdutoId && !produto?.id) {
      setIsFetching(true)
      fetch(`/api/user/catalogo/detalhes?id=${predefProdutoId}`)
        .then(res => res.json())
        .then(data => {
          setObraData(data)
        })
        .finally(() => setIsFetching(false))
    }
  }, [predefProdutoId])

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      if (!data.preco || data.preco.trim() === "") {
        throw new Error("Por favor, preencha o preço sugerido.");
      }
      
      const precoNumber = parseFloat(data.preco.replace(",", "."));
      if (isNaN(precoNumber) || precoNumber < 0) {
        throw new Error("O preço informado possui um formato inválido.");
      }

      const response = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grupo_id: data.grupo_id,
          preco: precoNumber,
          produto_id: predefProdutoId || produto?.produto_id,
          nome: obraData?.nome, // Dados que vieram do fetch
          imagem_url: obraData?.imagem_url,
          plataforma: obraData?.plataforma,
          link_serie: obraData?.link_serie
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Falha ao vincular")
      }
      toast.success("Obra vinculada ao seu acervo!")
      router.push("/dashboard/produtos")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4 border-2 border-dashed border-primary/20 rounded-[2.5rem] bg-primary/5">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="font-black italic uppercase text-xs tracking-widest text-primary">Sincronizando Dados Globais...</p>
    </div>
  )

  return (
    <Card className="border-2 border-white/5 bg-zinc-950 rounded-[2.5rem] overflow-hidden shadow-2xl">
      
      {/* HEADER DINÂMICO COM BANNER */}
      <div className="relative h-48 w-full bg-zinc-900 overflow-hidden">
        {obraData?.imagem_url && (
          <img src={obraData.imagem_url} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110" alt="" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        <div className="relative p-8 flex items-end h-full gap-6">
          <div className="h-32 w-24 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl shrink-0 bg-zinc-800">
             {obraData?.imagem_url && <img src={obraData.imagem_url} className="h-full w-full object-cover" alt="" />}
          </div>
          <div className="flex-1 pb-2">
            <Badge className="mb-2 bg-primary/20 text-primary border-primary/30 font-black italic text-[9px] uppercase tracking-tighter">
              Vínculo de Acervo
            </Badge>
            <h2 className="text-2xl font-black italic uppercase leading-none text-white tracking-tighter line-clamp-1">
              {obraData?.nome || "Selecione uma Obra"}
            </h2>
            <div className="flex items-center gap-3 mt-2">
               <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 uppercase italic">
                 <Globe size={10} /> {obraData?.plataforma || "---"}
               </span>
               <span className="text-zinc-700">|</span>
               <span className="text-[10px] font-bold text-zinc-500 uppercase italic">ID: {predefProdutoId?.slice(0,8)}...</span>
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GRUPO DE VENDA */}
            <FormField control={form.control} name="grupo_id" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase italic text-zinc-500 ml-1">Configurar Destino</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold italic text-white focus:ring-primary/50 uppercase">
                      <SelectValue placeholder="Selecione o Grupo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {grupos.map(g => <SelectItem key={g.id} value={g.id} className="font-bold italic uppercase">{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* PREÇO */}
            <FormField control={form.control} name="preco" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase italic text-primary ml-1">Preço Unitário Sugerido</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black italic text-sm">$</span>
                    <Input {...field} className="h-12 pl-12 bg-primary/5 border-primary/20 rounded-xl font-black italic text-xl text-primary focus:border-primary transition-all" placeholder="0,00" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* ÁREA DE INFORMAÇÕES ADICIONAIS (PREENCHE O VAZIO) */}
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4">
             <div className="flex items-center gap-2 text-zinc-400">
                <Info size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase italic tracking-widest">Detalhes da Importação</span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-zinc-600 uppercase italic">Link Original</p>
                   <a href={obraData?.link_serie} target="_blank" className="text-[11px] font-black italic text-zinc-400 hover:text-primary transition-colors flex items-center gap-1.5 truncate">
                      {obraData?.link_serie || "Nenhum link disponível"} <ExternalLink size={10} />
                   </a>
                </div>
                <div className="space-y-1">
                   <p className="text-[9px] font-bold text-zinc-600 uppercase italic">Status Global</p>
                   <div className="flex items-center gap-1.5 text-emerald-500">
                      <CheckCircle2 size={12} />
                      <span className="text-[10px] font-black uppercase italic">Verificado pela Yakuza</span>
                   </div>
                </div>
             </div>
             
             {obraData?.descricao && (
               <>
                <Separator className="bg-white/5" />
                <div className="space-y-2">
                   <p className="text-[9px] font-bold text-zinc-600 uppercase italic">Sinopse da Obra</p>
                   <p className="text-[11px] text-zinc-400 italic leading-relaxed line-clamp-3">
                     {obraData.descricao}
                   </p>
                </div>
               </>
             )}
          </div>

          <CardFooter className="flex flex-col sm:flex-row gap-4 p-0 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => router.back()} 
              className="w-full sm:w-auto font-black uppercase italic text-zinc-500 hover:text-white"
            >
              Voltar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !obraData} 
              className="w-full flex-1 h-14 bg-primary text-primary-foreground font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Layers className="mr-2 h-5 w-5" />}
              {isLoading ? "VINCULANDO..." : "CONFIRMAR VÍNCULO NO PERFIL"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}