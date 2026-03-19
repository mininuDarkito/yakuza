"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
import Link from "next/link"
import { ImagePlus, Loader2, Save, Globe, Lock, Layers } from "lucide-react"

const formSchema = z.object({
  grupo_id: z.string().min(1, "Selecione um grupo global"),
  nome: z.string().min(1, "O nome da série é obrigatório"),
  plataforma: z.string().optional().nullable(),
  imagem_url: z.string().optional().nullable(),
  link_serie: z.string().url("Insira um link válido").min(1, "O link da série é obrigatório"),
  descricao: z.string().optional().nullable(),
  preco: z.string().min(1, "Preço é obrigatório"),
  ativo: z.boolean().default(true),
})

type FormData = z.infer<typeof formSchema>

interface Grupo {
  id: string
  nome: string
}

interface ProdutoFormProps {
  produto?: {
    id: string
    grupo_id?: string | null
    nome: string
    descricao?: string | null
    preco?: string | number | null
    ativo?: boolean | null
    imagem_url?: string | null
    link_serie?: string | null
    plataforma?: string | null
  }
  grupos: Grupo[]
}

export function ProdutoForm({ produto, grupos }: ProdutoFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  
  // Lógica para capturar dados da URL (se estivermos duplicando/copiando)
  const queryNome = searchParams.get("nome")
  const queryPlataforma = searchParams.get("plataforma")
  const queryImagem = searchParams.get("imagem")
  const queryLink = searchParams.get("link")

  const [previewImage, setPreviewImage] = useState<string | null>(produto?.imagem_url || queryImagem || null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grupo_id: produto?.grupo_id || "",
      nome: produto?.nome || queryNome || "",
      descricao: produto?.descricao || "",
      preco: produto?.preco ? String(produto.preco).replace(".", ",") : "",
      ativo: produto?.ativo ?? true,
      imagem_url: produto?.imagem_url || queryImagem || "",
      link_serie: produto?.link_serie || queryLink || "",
      plataforma: produto?.plataforma || queryPlataforma || "",
    },
  })

  // Sincroniza o preview se a URL mudar (ou carregar)
  useEffect(() => {
    if (queryImagem && !produto?.id) {
        setPreviewImage(queryImagem)
    }
  }, [queryImagem, produto?.id])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setPreviewImage(base64String)
        form.setValue("imagem_url", base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          id: produto?.id, 
          preco: parseFloat(data.preco.replace(",", ".")),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Falha ao processar requisição")
      }

      toast.success(produto?.id 
        ? "Vínculo atualizado com sucesso!" 
        : "Série vinculada ao grupo com sucesso!"
      )
      
      router.refresh()
      router.push("/dashboard/produtos")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-3xl border-2 border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden rounded-[2rem]">
      <CardHeader className="bg-white/5 border-b border-white/5 p-8">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">
                {produto?.id ? `CONFIGURAR VÍNCULO` : "NOVO VÍNCULO"}
                </CardTitle>
                <CardDescription className="font-bold uppercase text-[10px] text-zinc-500 tracking-widest mt-1">
                {produto?.id 
                  ? `Editando oferta para: ${produto.nome}`
                  : "Associe uma obra a um grupo e defina o preço de venda."
                }
                </CardDescription>
            </div>
            <div className="bg-primary/10 p-3 rounded-2xl">
                <Layers size={24} className="text-primary animate-pulse" />
            </div>
        </div>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-8">
          <CardContent className="space-y-8 p-0">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-zinc-400 flex items-center gap-2">
                        <Globe size={12} /> Nome da Obra
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Solo Leveling" 
                        {...field} 
                        className="h-12 bg-white/5 border-white/10 font-bold italic text-white focus:border-primary transition-all uppercase" 
                      />
                    </FormControl>
                    <FormDescription className="text-[9px] uppercase font-bold italic text-zinc-500">
                      Se o nome já existir, ele será vinculado ao novo grupo selecionado.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grupo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-zinc-400">Grupo de Destino (Discord)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 font-bold italic uppercase text-white">
                          <SelectValue placeholder="Selecione o Grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        {grupos.map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.id} className="font-bold uppercase italic text-white focus:bg-primary focus:text-black">
                            {grupo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-[9px] uppercase font-bold italic text-zinc-500">
                      Escolha em qual canal do bot esta obra será vendida.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormLabel className="text-[11px] font-black uppercase italic text-zinc-400">Identidade Visual (Global)</FormLabel>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                <div className="relative flex h-52 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/10 bg-black shadow-2xl">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-12 w-12 text-white/10" />
                  )}
                </div>
                <div className="flex flex-col gap-4 w-full">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Upload de Capa</p>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="bg-white/5 border-white/10 cursor-pointer font-bold text-xs h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Link da Imagem</p>
                    <FormField
                        control={form.control}
                        name="imagem_url"
                        render={({ field }) => (
                            <Input 
                                placeholder="https://..." 
                                {...field} 
                                value={field.value || ""} 
                                onChange={(e) => {
                                    field.onChange(e.target.value)
                                    setPreviewImage(e.target.value)
                                }}
                                className="h-10 bg-white/5 border-white/10 font-medium text-xs italic" 
                            />
                        )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="plataforma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-zinc-400">Plataforma Origem</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Kakao" {...field} value={field.value || ""} className="h-12 bg-white/5 border-white/10 font-bold italic text-white uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-primary">Preço (R$) Neste Grupo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        className="h-12 bg-white/5 border-primary/20 border-2 font-black text-xl text-emerald-400 italic"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d,]/g, "")
                          field.onChange(value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link_serie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase italic text-zinc-400">URL da Obra</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value || ""} className="h-12 bg-white/5 border-white/10 font-medium text-zinc-300 italic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase italic text-zinc-400">Sinopse</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="..."
                      className="min-h-[100px] bg-white/5 border-white/10 font-medium italic text-zinc-400 resize-none rounded-2xl"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-[2rem] border-2 border-white/5 p-6 bg-white/[0.02]">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-black uppercase italic tracking-tighter text-white flex items-center gap-2">
                        <Lock size={14} className="text-zinc-500" /> Ativo para Venda
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between p-0 pt-8 border-t border-white/5">
            <Button variant="ghost" asChild className="font-black uppercase italic text-zinc-500">
              <Link href="/dashboard/produtos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isLoading} className="font-black uppercase italic px-10 h-12 bg-primary text-black rounded-2xl shadow-xl hover:scale-105 transition-all">
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Salvar Vínculo"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}