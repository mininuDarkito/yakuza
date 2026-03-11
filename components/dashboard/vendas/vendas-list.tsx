"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ImagePlus, MoreHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Venda {
  id: string
  produto_nome: string
  produto_imagem?: string
  grupo_nome: string
  quantidade: number // O número do capítulo
  preco_unitario: string | number
  preco_total: string | number
  data_venda: string
  observacoes?: string
}

export function VendasList({ vendas }: { vendas: Venda[] }) {
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de capítulo?")) return

    try {
      const res = await fetch(`/api/vendas/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      
      toast.success("Venda removida com sucesso")
      router.refresh()
    } catch (error) {
      toast.error("Erro ao remover venda")
    }
  }

  if (vendas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Nenhuma venda encontrada.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[120px]">Data</TableHead>
            <TableHead>Série</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead className="text-center">Capítulo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((venda) => (
            <TableRow key={venda.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">
                {format(new Date(venda.data_venda), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-8 flex-shrink-0 overflow-hidden rounded border bg-muted">
                    {venda.produto_imagem ? (
                      <img
                        src={venda.produto_imagem}
                        alt=""
                        className="h-full w-full object-cover transition-all duration-300 hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground/40">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <span className="font-bold truncate max-w-[150px] md:max-w-xs">
                    {venda.produto_nome}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
                  {venda.grupo_nome}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm font-black text-primary bg-primary/10 px-2 py-1 rounded">
                  {venda.quantidade}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(venda.preco_total))}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive cursor-pointer"
                      onClick={() => handleDelete(venda.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}