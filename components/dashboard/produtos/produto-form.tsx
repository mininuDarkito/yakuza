"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Form,
  FormControl,
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
import { ImagePlus, Loader2, Globe, Lock, Layers, BookOpen } from "lucide-react"

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

interface Grupo { id: string; nome: string }

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
  
  // Lógica Yakuza Raws: Captura dados do "Explorar Catálogo"
  const predefProdutoId = searchParams.get("produtoId")
  const predefNome = searchParams.get("nome")
  const predefPlat = searchParams.get("plataforma")
  const predefImagem = searchParams.get("imagem")
  const predefLink = searchParams.get("link")

  const [previewImage, setPreviewImage] = useState<string | null>(produto?.imagem_url || predefImagem || null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grupo_id: produto?.grupo_id || "",
      nome: produto?.nome || predefNome || "",
      descricao: produto?.descricao || "",
      preco: produto?.preco ? String(produto.preco).replace(".", ",") : "",
      ativo: produto?.ativo ?? true,
      imagem_url: produto?.imagem_url || predefImagem || "",
      link_serie: produto?.link_serie || predefLink || "",
      plataforma: produto?.plataforma || predefPlat || "",
    },
  })

  // Modo "Apenas Vínculo" - Se viemos do catálogo global, não deixamos o usuário comum mudar dados globais
  const isSelfService = !!predefProdutoId && !produto?.id

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          id: produto?.id, // ID da user_series se for edição
          preco: parseFloat(data.preco.replace(",", ".")),
        }),
      })

      if (!response.ok) throw new Error("Falha ao sincronizar obra")

      toast.success(produto?.id ? "Configuração atualizada!" : "Obra vinculada ao seu perfil!")
      router.refresh()
      router.push("/dashboard/produtos")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-3xl border-2 border-border bg-card shadow-2xl overflow-hidden rounded-[2.5rem]">
      <CardHeader className="bg-muted/30 border-b border-border p-8">
        <div className="flex items-center justify-between">
            <div>
                <CardTitle className="text-3xl font-black uppercase italic tracking-tighter text-foreground">
                {produto?.id ? `EDITAR OFERTA` : isSelfService ? "VINCULAR OBRA" : "NOVA SÉRIE"}
                </CardTitle>
                <CardDescription className="font-bold uppercase text-[10px] text-muted-foreground tracking-widest mt-1">
                {isSelfService ? `Importando do catálogo: ${predefNome}` : "Defina o preço e o canal de venda para esta obra."}
                </CardDescription>
            </div>
            <div className="bg-primary/10 p-4 rounded-3xl">
                <Layers size={28} className="text-primary" />
            </div>
        </div>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
          <CardContent className="space-y-8 p-0">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-muted-foreground flex items-center gap-2">
                        <BookOpen size={12} /> Título da Obra
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        readOnly={isSelfService}
                        className="h-12 bg-muted/20 border-border font-bold italic text-foreground focus:border-primary transition-all uppercase rounded-xl" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grupo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-muted-foreground">Canal de Destino</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-muted/20 border-border font-bold italic uppercase text-foreground rounded-xl">
                          <SelectValue placeholder="Escolha o Grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-popover border-border">
                        {grupos.map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.id} className="font-bold uppercase italic focus:bg-primary focus:text-primary-foreground">
                            {grupo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8 p-6 rounded-[2rem] bg-muted/10 border border-border">
                <div className="relative flex h-52 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-2xl">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-12 w-12 text-muted-foreground/30" />
                  )}
                </div>
                <div className="flex flex-col gap-4 w-full">
                   <FormField
                        control={form.control}
                        name="imagem_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Link da Imagem (Capa)</FormLabel>
                            <Input 
                                {...field} 
                                readOnly={isSelfService}
                                value={field.value || ""} 
                                className="h-11 bg-muted/20 border-border font-medium text-xs italic rounded-lg" 
                            />
                          </FormItem>
                        )}
                    />
                   <FormField
                        control={form.control}
                        name="plataforma"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Origem</FormLabel>
                            <Input 
                                {...field} 
                                readOnly={isSelfService}
                                value={field.value || ""} 
                                className="h-11 bg-muted/20 border-border font-bold text-xs italic uppercase rounded-lg" 
                            />
                          </FormItem>
                        )}
                    />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField
                control={form.control}
                name="preco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase italic text-primary">Preço Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        className="h-14 bg-primary/5 border-primary/20 border-2 font-black text-2xl text-primary italic rounded-2xl"
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

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 border-border p-4 bg-muted/10">
                    <FormLabel className="text-xs font-black uppercase italic tracking-tighter flex items-center gap-2">
                        <Lock size={14} className="text-muted-foreground" /> Liberado para Vendas
                    </FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="link_serie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-black uppercase italic text-muted-foreground">Link da Obra (URL)</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={isSelfService} className="h-12 bg-muted/20 border-border font-medium italic rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between p-0 pt-8 border-t border-border">
            <Button variant="ghost" asChild className="font-black uppercase italic text-muted-foreground hover:bg-muted/50 rounded-xl">
              <Link href="/dashboard/produtos">Voltar</Link>
            </Button>
            <Button type="submit" disabled={isLoading} className="font-black uppercase italic px-12 h-14 bg-primary text-primary-foreground rounded-[1.5rem] shadow-xl hover:scale-105 transition-all">
              {isLoading ? <Loader2 className="animate-spin mr-2" /> : "Salvar Configuração"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}