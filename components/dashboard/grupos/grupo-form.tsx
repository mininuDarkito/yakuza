"use client"

import { useState, useEffect } from "react"
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
import Link from "next/link"
import { FolderPlus, Save, X, Loader2, Hash, RefreshCcw } from "lucide-react"
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/components/ui/select"

const formSchema = z.object({
  nome: z.string().min(1, "O nome do grupo é obrigatório"),
  channel_id: z.string().min(1, "Selecione um canal do Discord"),
  descricao: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface GrupoFormProps {
  grupo?: {
    id: string
    nome: string
    descricao: string | null
    channel_id: string | null
  }
}

export function GrupoForm({ grupo }: GrupoFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false) // Corrigido: Adicionado estado
  const [canais, setCanais] = useState<{ id: string; nome: string }[]>([])
  const [loadingCanais, setLoadingCanais] = useState(false)

  // Busca canais via API do Discord
  const fetchDiscordChannels = async () => {
    setLoadingCanais(true)
    try {
      const res = await fetch("/api/discord/canais")
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (Array.isArray(data)) setCanais(data)
    } catch {
      toast.error("Erro ao sincronizar com seu Discord")
    } finally {
      setLoadingCanais(false)
    }
  }

  useEffect(() => { fetchDiscordChannels() }, [])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: grupo?.nome || "",
      channel_id: grupo?.channel_id || "",
      descricao: grupo?.descricao || "",
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const url = grupo ? `/api/grupos/${grupo.id}` : "/api/grupos"
      const method = grupo ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao salvar grupo")
      }

      toast.success(grupo ? "Grupo atualizado" : "Grupo criado com sucesso")
      router.push("/dashboard/grupos")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl border border-white/10 shadow-xl bg-card overflow-hidden rounded-[2rem]">
      <div className="bg-primary/5 p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-primary-foreground shadow-lg shadow-primary/20">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
              {grupo ? "Editar Grupo" : "Configurar Grupo"}
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest italic leading-none mt-1">
              Vincule um nome de grupo a um canal do Discord
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="pt-8 space-y-6">
            
            {/* NOME DO GRUPO */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-black uppercase italic text-[11px] text-zinc-400">Nome do Grupo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Scan do Jakson" {...field} className="h-12 bg-muted/20 border-white/5 font-bold italic text-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SELETOR DE CANAL DO DISCORD */}
            <FormField
              control={form.control}
              name="channel_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel className="font-black uppercase italic text-[11px] text-zinc-400">Vincular ao Servidor/Canal</FormLabel>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={fetchDiscordChannels}
                      disabled={loadingCanais}
                      className="h-6 text-[9px] uppercase font-black italic hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {loadingCanais ? <Loader2 className="animate-spin h-3 w-3" /> : <RefreshCcw className="h-3 w-3 mr-1" />}
                      Sincronizar
                    </Button>
                  </div>
                  
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 bg-muted/20 border-white/5 font-bold italic text-white">
                        <SelectValue placeholder={loadingCanais ? "Buscando seus canais..." : "Selecione o canal de destino"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white shadow-2xl">
                      {canais.length > 0 ? canais.map((canal) => (
                        <SelectItem key={canal.id} value={canal.id} className="font-bold italic focus:bg-primary focus:text-black">
                          <div className="flex items-center gap-2">
                            <Hash size={14} className="opacity-50" />
                            {canal.nome}
                          </div>
                        </SelectItem>
                      )) : (
                        <div className="p-4 text-[10px] text-center font-black uppercase italic text-zinc-500">
                          Nenhum servidor encontrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px] italic text-zinc-500">
                    Apenas canais onde você tem permissão de gerenciamento aparecem aqui.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* NOTAS / DESCRIÇÃO */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-black uppercase italic text-[11px] text-zinc-400">Notas de Organização</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Opcional..." {...field} className="min-h-[100px] bg-muted/20 border-white/5 italic text-white resize-none focus:ring-1 focus:ring-primary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </CardContent>

          <CardFooter className="flex justify-between border-t border-white/5 bg-muted/20 p-6">
            <Button 
              variant="ghost" 
              asChild 
              disabled={isLoading}
              className="font-black uppercase italic text-xs hover:bg-white/5 text-zinc-400"
            >
              <Link href="/dashboard/grupos">
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Link>
            </Button>
            
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="px-8 font-black uppercase italic text-xs tracking-tighter shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] bg-primary text-primary-foreground"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-black" />
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {grupo ? "Atualizar Grupo" : "Criar Grupo"}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}