"use client"

import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { ImagePlus, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button" // <-- Certifique-se de que este caminho está correto

interface Venda {
  id: string
  produto_id: string 
  produto_nome: string
  imagem_url?: string | null 
  grupo_nome: string
  quantidade: number 
  preco_total: string | number
  created_at: string
}

export function RecentSales({ vendas }: { vendas: Venda[] }) {
  if (vendas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShoppingCart className="h-8 w-8 text-muted-foreground/20 mb-2" />
        <p className="text-sm text-muted-foreground font-medium">Nenhuma venda registrada ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {vendas.map((venda) => (
        <div key={venda.id} className="flex items-center gap-4 group">
          {/* FOTO DA CAPA */}
          <div className="relative h-12 w-9 flex-shrink-0 overflow-hidden rounded-md border bg-muted shadow-sm">
            {venda.imagem_url ? (
              <img
                src={venda.imagem_url}
                alt={venda.produto_nome}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/40">
                <ImagePlus className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* LINK E INFO */}
          <div className="flex-1 min-w-0 space-y-1">
            <Link 
              href={`/dashboard/vendas`} // Link para a listagem geral ou específica
              className="text-sm font-bold leading-none hover:text-primary transition-colors block truncate"
            >
              {venda.produto_nome}
            </Link>
            <p className="text-xs text-muted-foreground truncate">
              {venda.grupo_nome} • <span className="font-semibold text-primary">Cap. {venda.quantidade}</span>
            </p>
          </div>

          {/* VALOR E TEMPO */}
          <div className="text-right">
            <p className="text-sm font-black tracking-tight text-foreground">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(Number(venda.preco_total))}
            </p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70">
              {formatDistanceToNow(new Date(venda.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
      ))}
      
      {/* BOTÃO VER TODOS */}
      <Button variant="outline" className="w-full text-xs font-bold uppercase tracking-wider" asChild>
        <Link href="/dashboard/vendas">Ver histórico completo</Link>
      </Button>
    </div>
  )
}