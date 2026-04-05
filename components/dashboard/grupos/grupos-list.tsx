"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
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
import { MoreHorizontal, Pencil, Trash2, FolderOpen, Coins, ShieldCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

interface Grupo {
  id: string
  nome: string
  descricao: string | null
  produtos_count: string | number
  faturamento_total?: string | number
  created_at: string
}

export function GruposList({ grupos }: { grupos: Grupo[] }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAdmin = session?.user?.role === 'admin'

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

      toast.success("Grupo global removido do sistema")
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
      <Card className="border-dashed bg-muted/5 border-white/10 rounded-[2rem]">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="bg-primary/10 rounded-3xl p-6 mb-6">
            <FolderOpen className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Nenhum Grupo Mapeado</h3>
          <p className="text-zinc-500 text-center mb-8 max-w-sm font-medium italic text-sm">
            Os grupos globais vinculam canais do Discord ao sistema de faturamento.
          </p>
          {isAdmin && (
            <Button asChild size="lg" className="font-black uppercase italic bg-primary text-black rounded-xl px-8 hover:scale-105 transition-all">
              <Link href="/dashboard/grupos/novo">Registrar Primeiro Grupo</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="overflow-hidden border-white/5 bg-zinc-950/50 rounded-[2rem] shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="font-black uppercase italic text-[11px] text-zinc-500 py-4">Identificação Global</TableHead>
              <TableHead className="hidden md:table-cell font-black uppercase italic text-[11px] text-zinc-500">Status do Canal</TableHead>
              <TableHead className="text-center font-black uppercase italic text-[11px] text-zinc-500">Minhas Obras</TableHead>
              <TableHead className="text-right font-black uppercase italic text-[11px] text-zinc-500">Meu Desempenho</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((grupo) => (
              <TableRow key={grupo.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                <TableCell className="py-6">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xl tracking-tighter uppercase italic text-white group-hover:text-primary transition-colors">
                        {grupo.nome}
                      </span>
                      {isAdmin && <ShieldCheck size={14} className="text-primary/50" />}
                    </div>
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest italic mt-1">
                      Sistema ativo há {formatDistanceToNow(new Date(grupo.created_at), { addSuffix: false, locale: ptBR })}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-zinc-400 italic text-sm font-medium">
                  {grupo.descricao || "Grupo de vendas ativo via Discord."}
                </TableCell>
                <TableCell className="text-center">
                  <span className="bg-white/5 text-zinc-300 font-black italic px-4 py-1.5 rounded-full text-[10px] border border-white/10 uppercase">
                    {grupo.produtos_count} vinculadas
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-black text-xl tracking-tighter text-emerald-400 italic">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "USD",
                      }).format(Number(grupo.faturamento_total || 0))}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-black uppercase italic tracking-widest">
                      <Coins className="h-3 w-3" /> Pessoal
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-xl">
                          <MoreHorizontal className="h-5 w-5 text-zinc-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 rounded-2xl p-2 shadow-2xl">
                        <DropdownMenuItem asChild className="cursor-pointer rounded-xl focus:bg-primary focus:text-black">
                          <Link href={`/dashboard/grupos/${grupo.id}/editar`} className="font-black uppercase italic text-xs flex items-center">
                            <Pencil className="mr-2 h-4 w-4" />
                            Ajustar Configurações
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:bg-red-500 focus:text-white cursor-pointer font-black uppercase italic text-xs rounded-xl mt-1"
                          onClick={() => setDeleteId(grupo.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deletar Grupo Global
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* ALERT DIALOG REESTILIZADO */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-3xl font-black uppercase italic tracking-tighter text-white">
              Remover Grupo <span className="text-red-500">Definitivamente?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 font-medium italic text-base py-4">
              Atenção Admin: Esta ação desconecta o canal do Discord do nosso banco. As vendas existentes permanecerão salvas, mas o comando <code className="text-primary">/venda</code> parará de funcionar neste canal imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4">
            <AlertDialogCancel disabled={isDeleting} className="rounded-2xl font-black uppercase italic border-white/10 hover:bg-white/5 transition-all">
              Abortar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700 rounded-2xl font-black uppercase italic px-8 shadow-lg shadow-red-900/20"
            >
              {isDeleting ? "Processando..." : "Confirmar Remoção"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}