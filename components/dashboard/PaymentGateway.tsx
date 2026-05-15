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
import { Wallet, Save, Loader2, Copy, CheckCircle2 } from "lucide-react"

const billingSchema = z.object({
  nome_beneficiario: z.string().min(3, "Nome muito curto"),
  tipo_chave: z.enum(["pix", "email", "telefone", "cpf", "cnpj", "Binance"]),
  chave_pix: z.string().min(1, "Chave Pix é obrigatória"),
})

interface PaymentGatewayProps {
  userId: string;
  initialData: any;
  viewMode: 'admin' | 'user';
}

export function PaymentGateway({ userId, initialData, viewMode }: PaymentGatewayProps) {
  const [loading, setLoading] = useState(false)
  const billing = initialData || {}

  const form = useForm<z.infer<typeof billingSchema>>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      nome_beneficiario: billing.nome_beneficiario || "",
      tipo_chave: billing.tipo_chave || "pix",
      chave_pix: billing.chave_pix || "",
    },
  })

  async function onSubmit(data: z.infer<typeof billingSchema>) {
    setLoading(true)
    try {
      const res = await fetch(`/api/user/billing`, {
        method: "PATCH",
        body: JSON.stringify({ ...data, userId }), // Enviamos o userId para garantir
      })
      if (!res.ok) throw new Error()
      toast.success("Dados de faturamento atualizados!")
    } catch (err) {
      toast.error("Erro ao salvar configurações")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Chave copiada para a área de transferência!")
  }

  // --- MODO ADMIN: VISUALIZAÇÃO ESTILIZADA ---
  if (viewMode === 'admin') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Gateway de Pagamento (PIX)
        </h2>
        <Card className="bg-zinc-950 border-white/5 overflow-hidden shadow-2xl">
          <CardContent className="p-8 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 group hover:border-primary/30 transition-colors">
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Titular da Conta</p>
                <p className="text-sm font-black uppercase italic text-white">{billing.nome_beneficiario || "NÃO CADASTRADO"}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 group hover:border-primary/30 transition-colors">
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Tipo de Identificador</p>
                <p className="text-sm font-black uppercase italic text-white">{billing.tipo_chave || "N/A"}</p>
              </div>
            </div>
            
            <div 
              onClick={() => billing.chave_pix && copyToClipboard(billing.chave_pix)}
              className="flex flex-col justify-center gap-3 bg-primary/5 p-6 rounded-3xl border border-primary/20 cursor-pointer group hover:bg-primary/10 transition-all relative overflow-hidden"
            >
              <div className="absolute top-2 right-4 opacity-20 group-hover:opacity-100 transition-opacity">
                <Copy className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[10px] font-black text-primary uppercase text-center italic tracking-widest">Chave Destinatária Ativa</p>
              <div className="text-center font-mono text-sm font-black break-all text-white">
                {billing.chave_pix || "AGUARDANDO CONFIGURAÇÃO"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- MODO USER: FORMULÁRIO DE EDIÇÃO ---
  return (
    <Card className="border-2 border-white/5 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader className="bg-primary/5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <CardTitle className="uppercase tracking-tighter italic font-black text-white">Configuração de Recebimento</CardTitle>
        </div>
        <CardDescription className="text-zinc-500 font-medium">Como você deseja receber pelos seus capítulos?</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
          <FormField
            control={form.control}
            name="nome_beneficiario"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold uppercase text-[10px] text-zinc-400 tracking-widest">Nome do Titular (Como no Banco)</FormLabel>
                <FormControl>
                  <Input className="bg-zinc-950 border-white/10 font-bold italic focus:border-primary" placeholder="Ex: João Silva da Scan" {...field} />
                </FormControl>
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
                  <FormLabel className="font-bold uppercase text-[10px] text-zinc-400 tracking-widest">Tipo de Chave</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-zinc-950 border-white/10 font-bold italic">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white font-bold italic">
                      <SelectItem value="pix">Chave Aleatória</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="telefone">Telefone</SelectItem>
                      <SelectItem value="Binance">Binance</SelectItem>
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
                  <FormLabel className="font-bold uppercase text-[10px] text-zinc-400 tracking-widest">Sua Chave Pix / ID</FormLabel>
                  <FormControl>
                    <Input className="bg-zinc-950 border-white/10 font-mono font-bold focus:border-primary" placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full font-black uppercase italic h-12 shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-primary/30 transition-all">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Salvar Perfil de Recebimento
          </Button>
        </form>
      </Form>
    </Card>
  )
}