"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CreditCard, Wallet, Save, Loader2 } from "lucide-react"

const billingSchema = z.object({
  nome_beneficiario: z.string().min(3, "Nome muito curto"),
  tipo_chave: z.enum(["pix", "email", "telefone", "cpf", "cnpj"]),
  chave_pix: z.string().min(1, "Chave Pix é obrigatória"),
  instrucoes: z.string().optional(),
})

export function BillingForm({ initialData }: { initialData: any }) {
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof billingSchema>>({
    resolver: zodResolver(billingSchema),
    defaultValues: initialData || {
      nome_beneficiario: "",
      tipo_chave: "pix",
      chave_pix: "",
      instrucoes: "",
    },
  })

  async function onSubmit(data: z.infer<typeof billingSchema>) {
    setLoading(true)
    try {
      const res = await fetch("/api/user/billing", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast.success("Dados de faturamento atualizados!")
    } catch (err) {
      toast.error("Erro ao salvar configurações")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-2">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="uppercase tracking-tighter italic font-black">Configuração de Recebimento</CardTitle>
        </div>
        <CardDescription>Como você deseja que seus clientes paguem pelos capítulos?</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
          <FormField
            control={form.control}
            name="nome_beneficiario"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-xs">Nome do Titular (Como aparece no banco)</FormLabel>
                <FormControl><Input placeholder="Ex: João Silva da Scan" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo_chave"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs">Tipo de Chave</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="pix">Chave Aleatória</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chave_pix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold uppercase text-xs">Sua Chave Pix</FormLabel>
                  <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full font-black uppercase italic">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Perfil de Vendas
          </Button>
        </form>
      </Form>
    </Card>
  )
}