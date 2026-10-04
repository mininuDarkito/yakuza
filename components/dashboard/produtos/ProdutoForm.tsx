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
  Loader2, Layers, Globe, 
  ExternalLink, Info, CheckCircle2, Search, Plus, Sparkles, RefreshCw
} from "lucide-react"

const PLATAFORMAS_SUGERIDAS = [
  "KakaoPage",
  "Lezhin",
  "Mechacomic",
  "Naver",
  "Piccoma",
  "Kuaikan",
  "Bilibili",
  "Ridibooks",
  "MrBlue",
  "Webtoons",
  "Tapas",
  "Manta",
  "Outra"
]

export function ProdutoForm({ produto, grupos }: { produto?: any, grupos: any[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [mode, setMode] = useState<"search" | "manual">("manual")
  
  // Catálogo Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const predefProdutoId = searchParams.get("produtoId")

  const form = useForm<any>({
    defaultValues: {
      id: produto?.id || undefined,
      produto_id: produto?.produto_id || predefProdutoId || "",
      nome: produto?.nome || "",
      plataforma: produto?.plataforma || "KakaoPage",
      link_serie: produto?.link_serie || "",
      imagem_url: produto?.imagem_url || "",
      descricao: produto?.descricao || "",
      grupo_id: produto?.grupo_id || grupos[0]?.id || "",
      preco: produto?.preco ? String(produto.preco).replace(".", ",") : "",
    },
  })

  const watchNome = form.watch("nome")
  const watchImagemUrl = form.watch("imagem_url")
  const watchPlataforma = form.watch("plataforma")
  const watchLinkSerie = form.watch("link_serie")
  const watchDescricao = form.watch("descricao")

  // Carregar produto via query param ou prop
  useEffect(() => {
    if (predefProdutoId && !produto?.id) {
      setIsFetching(true)
      fetch(`/api/user/catalogo/detalhes?id=${predefProdutoId}`)
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            form.setValue("produto_id", data.id || predefProdutoId)
            form.setValue("nome", data.nome || "")
            form.setValue("plataforma", data.plataforma || "KakaoPage")
            form.setValue("link_serie", data.link_serie || "")
            form.setValue("imagem_url", data.imagem_url || "")
            form.setValue("descricao", data.descricao || "")
            setMode("search")
          }
        })
        .catch(() => toast.error("Falha ao buscar detalhes da obra"))
        .finally(() => setIsFetching(false))
    } else if (produto) {
      form.reset({
        id: produto.id,
        produto_id: produto.produto_id || "",
        nome: produto.nome || "",
        plataforma: produto.plataforma || "KakaoPage",
        link_serie: produto.link_serie || "",
        imagem_url: produto.imagem_url || "",
        descricao: produto.descricao || "",
        grupo_id: produto.grupo_id || grupos[0]?.id || "",
        preco: produto.preco ? String(produto.preco).replace(".", ",") : "",
      })
      setMode("manual")
    }
  }, [predefProdutoId, produto])

  // Efeito para buscar no catálogo global quando o usuário digita no modo busca
  useEffect(() => {
    if (mode !== "search" || !searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      setIsSearching(true)
      fetch(`/api/user/catalogo?search=${encodeURIComponent(searchQuery)}&limit=8`)
        .then(res => res.json())
        .then(data => {
          if (data?.items) {
            setSearchResults(data.items)
          } else {
            setSearchResults([])
          }
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, mode])

  const selectSerieFromCatalog = (item: any) => {
    form.setValue("produto_id", item.id)
    form.setValue("nome", item.nome || "")
    form.setValue("plataforma", item.plataforma || "KakaoPage")
    form.setValue("link_serie", item.link_serie || "")
    form.setValue("imagem_url", item.imagem_url || "")
    form.setValue("descricao", item.descricao || "")
    setSearchQuery("")
    setSearchResults([])
    toast.success(`Obra "${item.nome}" selecionada do catálogo!`)
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      if (!data.nome || data.nome.trim() === "") {
        throw new Error("Por favor, preencha o nome da série.");
      }

      if (!data.grupo_id) {
        throw new Error("Por favor, selecione um grupo de destino.");
      }

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
          id: data.id,
          grupo_id: data.grupo_id,
          preco: precoNumber,
          produto_id: data.produto_id || undefined,
          nome: data.nome.trim(),
          imagem_url: data.imagem_url?.trim() || null,
          plataforma: data.plataforma?.trim() || "auto",
          link_serie: data.link_serie?.trim() || null,
          descricao: data.descricao?.trim() || null
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Falha ao cadastrar/vincular obra")
      }
      
      toast.success("Série salva e vinculada com sucesso!")
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
      
      {/* SELETOR DE MODO (BUSCAR NO CATÁLOGO OU CRIAR DO ZERO) */}
      <div className="p-6 bg-zinc-900/60 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-xs font-black uppercase italic tracking-wider text-white">Método de Cadastro</span>
        </div>
        <div className="flex bg-zinc-950 border border-white/10 rounded-2xl p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setMode("manual")
              form.setValue("produto_id", "")
            }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black italic uppercase text-[10px] transition-all flex items-center justify-center gap-2 ${
              mode === "manual" ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Plus className="h-3.5 w-3.5" /> Criar Série do Zero
          </button>

          <button
            type="button"
            onClick={() => setMode("search")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black italic uppercase text-[10px] transition-all flex items-center justify-center gap-2 ${
              mode === "search" ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Search className="h-3.5 w-3.5" /> Buscar no Catálogo
          </button>
        </div>
      </div>

      {/* CAMPO DE BUSCA NO CATÁLOGO */}
      {mode === "search" && (
        <div className="p-6 bg-zinc-900/40 border-b border-white/5 space-y-3">
          <label className="text-[10px] font-black uppercase italic text-primary tracking-widest flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-primary" /> Pesquisar Série no Banco Global
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Digite o nome da obra para buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 bg-zinc-950 border-white/10 rounded-xl pl-4 pr-10 font-bold text-white text-sm focus:border-primary"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
            )}
          </div>

          {/* LISTA DE RESULTADOS DA BUSCA */}
          {searchResults.length > 0 && (
            <div className="bg-zinc-900 border border-white/10 rounded-2xl p-2 max-h-60 overflow-y-auto space-y-1 shadow-2xl">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => selectSerieFromCatalog(item)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/10 hover:border-primary/20 border border-transparent cursor-pointer transition-all"
                >
                  <img
                    src={item.imagem_url || "/placeholder.png"}
                    alt={item.nome}
                    className="h-10 w-8 object-cover rounded-lg bg-zinc-800 shrink-0"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black italic text-xs text-white truncate">{item.nome}</p>
                    <p className="text-[9px] font-bold text-primary italic uppercase">{item.plataforma || "Global"}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-[9px] font-black uppercase italic text-primary">
                    Selecionar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HEADER DINÂMICO COM BANNER */}
      <div className="relative h-44 w-full bg-zinc-900 overflow-hidden border-b border-white/5">
        {watchImagemUrl && (
          <img src={watchImagemUrl} className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 scale-110" alt="" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        
        <div className="relative p-6 flex items-end h-full gap-6">
          <div className="h-28 w-20 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl shrink-0 bg-zinc-900 flex items-center justify-center">
             {watchImagemUrl ? (
               <img src={watchImagemUrl} className="h-full w-full object-cover" alt="" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
             ) : (
               <Layers className="h-8 w-8 text-zinc-700" />
             )}
          </div>
          <div className="flex-1 pb-1">
            <Badge className="mb-2 bg-primary/20 text-primary border-primary/30 font-black italic text-[9px] uppercase tracking-tighter">
              {mode === "search" ? "Vínculo de Acervo" : "Nova Série (Manual)"}
            </Badge>
            <h2 className="text-2xl font-black italic uppercase leading-none text-white tracking-tighter line-clamp-1">
              {watchNome || "Nome da Série..."}
            </h2>
            <div className="flex items-center gap-3 mt-2">
               <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 uppercase italic">
                 <Globe size={10} className="text-primary" /> {watchPlataforma || "---"}
               </span>
               <span className="text-zinc-700">|</span>
               <span className="text-[10px] font-bold text-zinc-500 uppercase italic">
                 {form.watch("produto_id") ? `ID: ${form.watch("produto_id")?.slice(0,8)}...` : "Nova Inscrição"}
               </span>
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
          
          {/* INFORMAÇÕES BÁSICAS DA SÉRIE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase italic tracking-widest text-primary flex items-center gap-2">
                <Info size={14} /> Dados da Obra
              </span>
              {mode === "search" && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setMode("manual")}
                  className="text-[10px] font-black uppercase italic text-zinc-400 hover:text-primary p-0 h-auto"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Editar Dados Manualmente
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* NOME DA SÉRIE */}
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase italic text-zinc-400 ml-1">Nome da Série *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Solo Leveling" className="h-12 bg-white/5 border-white/10 rounded-xl font-bold italic text-white focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* PLATAFORMA */}
              <FormField control={form.control} name="plataforma" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase italic text-zinc-400 ml-1">Plataforma / Origem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "KakaoPage"}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold italic text-white focus:ring-primary/50 uppercase">
                        <SelectValue placeholder="Selecione a Plataforma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {PLATAFORMAS_SUGERIDAS.map(p => (
                        <SelectItem key={p} value={p} className="font-bold italic uppercase">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LINK DA SÉRIE */}
              <FormField control={form.control} name="link_serie" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase italic text-zinc-400 ml-1">Link Original da Série (URL)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://page.kakao.com/content/..." className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-xs text-zinc-300 focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* CAPA / IMAGEM URL */}
              <FormField control={form.control} name="imagem_url" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase italic text-zinc-400 ml-1">URL da Imagem da Capa</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://res.cloudinary.com/..." className="h-12 bg-white/5 border-white/10 rounded-xl font-mono text-xs text-zinc-300 focus:border-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* SINOPSE / DESCRIÇÃO */}
            <FormField control={form.control} name="descricao" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase italic text-zinc-400 ml-1">Sinopse / Descrição (Opcional)</FormLabel>
                <FormControl>
                  <textarea
                    {...field}
                    rows={3}
                    placeholder="Digite uma breve descrição ou sinopse da obra..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-zinc-300 italic focus:border-primary outline-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <Separator className="bg-white/5 my-4" />

          {/* CONFIGURAÇÃO DO VÍNCULO (GRUPO & PREÇO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GRUPO DE VENDA */}
            <FormField control={form.control} name="grupo_id" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase italic text-zinc-400 ml-1">Configurar Grupo de Destino *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold italic text-white focus:ring-primary/50 uppercase">
                      <SelectValue placeholder="Selecione o Grupo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    {grupos.map(g => <SelectItem key={g.id} value={g.id} className="font-bold italic uppercase">{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* PREÇO */}
            <FormField control={form.control} name="preco" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase italic text-primary ml-1">Preço Unitário Sugerido ($) *</FormLabel>
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

          <CardFooter className="flex flex-col sm:flex-row gap-4 p-0 pt-6">
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
              disabled={isLoading || !watchNome} 
              className="w-full flex-1 h-14 bg-primary text-primary-foreground font-black uppercase italic rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Layers className="mr-2 h-5 w-5" />}
              {isLoading ? "SALVANDO..." : "CONFIRMAR E SALVAR SÉRIE"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}