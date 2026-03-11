"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { MoreHorizontal, Pencil, Trash2, FolderOpen, Coins } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

interface Grupo {
  id: string
  nome: string
  descricao: string | null
  produtos_count: string | number
  faturamento_total?: string | number // Adicionado para visão financeira
  created_at: string
}

export function GruposList({ grupos }: { grupos: Grupo[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/grupos/${deleteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao excluir grupo")
      }

      toast.success("Grupo excluído com sucesso")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir grupo")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (grupos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="bg-muted rounded-full p-4 mb-4">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Nenhum grupo ativo</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Os grupos ajudam a organizar suas séries e rastrear o faturamento de forma independente.
          </p>
          <Button asChild size="lg" className="font-bold">
            <Link href="/dashboard/grupos/novo">Criar Primeiro Grupo</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden border-none shadow-sm lg:border lg:shadow-none">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-bold">Identificação</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="text-center">Séries Ativas</TableHead>
              <TableHead className="text-right">Total Gerado</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((grupo) => (
              <TableRow key={grupo.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="py-4">
                  <div className="flex flex-col">
                    <span className="font-black text-lg tracking-tight uppercase">{grupo.nome}</span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                      Criado {formatDistanceToNow(new Date(grupo.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground italic text-sm">
                  {grupo.descricao || "Sem descrição"}
                </TableCell>
                <TableCell className="text-center">
                  <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-xs">
                    {grupo.produtos_count} itens
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(grupo.faturamento_total || 0))}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                      <Coins className="h-3 w-3" /> ACUMULADO
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="hover:bg-muted">
                        <MoreHorizontal className="h-5 w-5" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link href={`/dashboard/grupos/${grupo.id}/editar`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar Detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer font-medium"
                        onClick={() => setDeleteId(grupo.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Grupo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter">Confirmar Exclusão?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Ao excluir o grupo, você não perderá as vendas, mas elas ficarão sem categoria. 
              Séries vinculadas a este grupo precisarão ser reatribuídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
            >
              {isDeleting ? "Processando..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}