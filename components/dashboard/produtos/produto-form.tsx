"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { ImagePlus, Loader2, Save } from "lucide-react"

// Schema de validação
const formSchema = z.object({
  grupo_id: z.string().min(1, "Selecione um grupo"),
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
  const [isLoading, setIsLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(produto?.imagem_url || null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grupo_id: produto?.grupo_id || "",
      nome: produto?.nome || "",
      descricao: produto?.descricao || "",
      // Formata o preçodo do banco (ponto) para o input (vírgula)
      preco: produto?.preco ? String(produto.preco).replace(".", ",") : "",
      ativo: produto?.ativo ?? true,
      imagem_url: produto?.imagem_url || "",
      link_serie: produto?.link_serie || "",
      plataforma: produto?.plataforma || "",
    },
  })

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
      // Centralizamos na rota /api/produtos que faz o UPSERT inteligente
      const response = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          // Mantemos o ID se for edição para o banco saber quem atualizar
          id: produto?.id, 
          // Converte "10,50" para 10.50 numérico antes de enviar
          preco: parseFloat(data.preco.replace(",", ".")),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Falha ao processar requisição")
      }

      toast.success(produto?.id ? "Configurações sincronizadas!" : "Série cadastrada!")
      
      // Limpa o cache do Next.js e redireciona
      router.refresh()
      router.push("/dashboard/produtos")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl border-2 shadow-xl overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">
          {produto?.id ? `Editar: ${produto.nome}` : "Novo Registro de Série"}
        </CardTitle>
        <CardDescription className="font-bold uppercase text-[10px]">
          {produto?.id 
            ? "As alterações serão refletidas em seu catálogo pessoal e nas vendas." 
            : "Preencha os dados para adicionar esta obra ao catálogo global."}
        </CardDescription>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
          <CardContent className="space-y-6 p-0">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* NOME DA SÉRIE */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase italic">Nome da Obra</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Solo Leveling" {...field} className="font-bold border-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* GRUPO */}
              <FormField
                control={form.control}
                name="grupo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase italic">Scan / Grupo Responsável</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="font-bold border-2 uppercase italic">
                          <SelectValue placeholder="Selecione o grupo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grupos.map((grupo) => (
                          <SelectItem key={grupo.id} value={grupo.id} className="font-bold uppercase italic">
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

            {/* PREVIEW E UPLOAD DE CAPA */}
            <div className="space-y-3">
              <FormLabel className="text-xs font-black uppercase italic">Capa do Volume / Série</FormLabel>
              <div className="flex items-center gap-6 p-4 rounded-2xl bg-muted/20 border-2 border-dashed">
                <div className="relative flex h-40 w-28 items-center justify-center overflow-hidden rounded-xl border-2 bg-zinc-950 shadow-2xl">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-white/20" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="max-w-xs cursor-pointer font-bold text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    Formatos: JPG, PNG ou WEBP. Máx: 2MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="plataforma"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase italic">Plataforma</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Kakao Page" {...field} value={field.value || ""} className="font-bold border-2 uppercase italic" />
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
                    <FormLabel className="text-xs font-black uppercase italic text-primary">Preço por Capítulo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0,00"
                        className="font-black border-2 text-lg text-emerald-600"
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
                  <FormLabel className="text-xs font-black uppercase italic">URL de Acesso (Link da Série)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} value={field.value || ""} className="font-bold border-2" />
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
                  <FormLabel className="text-xs font-black uppercase italic">Sinopse / Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descrição da obra para os clientes..."
                      className="min-h-[100px] font-medium border-2 resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* STATUS ATIVO */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 p-4 bg-muted/10 transition-colors">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-black uppercase italic tracking-tighter">Status de Venda</FormLabel>
                    <FormDescription className="text-[10px] font-bold uppercase">
                      Inativa oculta a série de sua loja pública
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between p-0 pt-6">
            <Button variant="outline" asChild className="font-bold uppercase italic border-2">
              <Link href="/dashboard/produtos">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={isLoading} className="font-black uppercase italic px-8 shadow-xl shadow-primary/20">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {produto?.id ? "Atualizar Configurações" : "Registrar Série"}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}