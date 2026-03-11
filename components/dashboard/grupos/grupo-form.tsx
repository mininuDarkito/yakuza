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
import { FolderPlus, Save, X, Loader2 } from "lucide-react"

const formSchema = z.object({
  nome: z.string().min(1, "O nome do grupo é obrigatório"),
  descricao: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface GrupoFormProps {
  grupo?: {
    id: string
    nome: string
    descricao: string | null
  }
}

export function GrupoForm({ grupo }: GrupoFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: grupo?.nome || "",
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

      toast.success(grupo ? "Configurações do grupo atualizadas" : "Novo grupo criado com sucesso")
      router.push("/dashboard/grupos")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar grupo")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl border-none shadow-none bg-transparent lg:border lg:shadow-sm lg:bg-card overflow-hidden">
      <div className="bg-primary/5 p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground">
            <FolderPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {grupo ? "Editar Grupo" : "Novo Grupo de Trabalho"}
            </h2>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
              {grupo ? "Atualize os detalhes da categoria" : "Organize suas séries em categorias"}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="pt-8 space-y-6">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-bold uppercase tracking-tighter">
                    Identificação do Grupo
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Nome da Scan ou canal" 
                      {...field} 
                      className="h-12 text-lg focus-visible:ring-primary font-medium"
                    />
                  </FormControl>
                  <FormDescription>
                    Este nome será usado para filtrar suas vendas no Dashboard.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-bold uppercase tracking-tighter">
                    Notas ou Descrição
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a finalidade deste grupo (opcional)"
                      {...field}
                      className="min-h-[120px] resize-none text-base focus-visible:ring-primary"
                    />
                  </FormControl>
                  <FormDescription>
                    Uma breve descrição para ajudar você a se organizar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-between border-t bg-muted/30 p-6">
            <Button 
              variant="ghost" 
              asChild 
              disabled={isLoading}
              className="font-bold text-muted-foreground hover:text-foreground"
            >
              <Link href="/dashboard/grupos">
                <X className="mr-2 h-4 w-4" />
                Descartar
              </Link>
            </Button>
            
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="px-8 font-black uppercase tracking-tighter shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {grupo ? "Salvar Alterações" : "Confirmar Criação"}
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}