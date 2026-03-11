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
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2, Clapperboard, Image as ImageIcon, ExternalLink, MonitorPlay } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Interface atualizada com plataforma
interface Produto {
  id: string
  nome: string
  descricao: string | null
  preco: string | number
  ativo: boolean
  grupo_nome: string
  created_at: string
  imagem_url: string | null
  link_serie: string | null
  plataforma: string | null // Novo campo
}

export function ProdutosList({ produtos }: { produtos: Produto[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState("")
  const [filterPlataforma, setFilterPlataforma] = useState("todos")

  // Lógica de filtragem reativa
  const produtosFiltrados = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase())
    const matchesPlataforma = filterPlataforma === "todos" || p.plataforma === filterPlataforma
    return matchesSearch && matchesPlataforma
  })

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/produtos/${deleteId}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao excluir série")
      }
      toast.success("Série excluída com sucesso")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir série")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const plataformasDisponiveis = Array.from(
    new Set(
      produtos
        .map((p) => p.plataforma)
        .filter((plat): plat is string => !!plat) // Remove null ou undefined
    )
  ).sort(); // Coloca em ordem alfabética

  if (produtos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clapperboard className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma série encontrada</h3>
          <Button asChild>
            <Link href="/dashboard/produtos/novo">Cadastrar Série</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* BARRA DE FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Pesquisar série pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          <Clapperboard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        <Select value={filterPlataforma} onValueChange={setFilterPlataforma}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas Plataformas</SelectItem>

            {plataformasDisponiveis.map((plataforma) => (
              <SelectItem key={plataforma} value={plataforma}>
                {plataforma}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <p className="text-xs text-muted-foreground sm:ml-auto">
          {produtosFiltrados.length} séries encontradas
        </p>
      </div>

      {/* TABELA DE SÉRIES */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Capa</TableHead>
              <TableHead>Informações</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosFiltrados.map((produto) => (
              <TableRow key={produto.id} className="group hover:bg-muted/50 transition-colors">
                {/* COLUNA DA CAPA COM ÂNCORA */}
                <TableCell>
                  {produto.link_serie ? (
                    <a
                      href={produto.link_serie}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block transition-transform hover:scale-105 active:scale-95"
                      title="Clique para assistir"
                    >
                      <div className="h-24 w-16 relative overflow-hidden rounded-md border-2 border-transparent group-hover:border-primary bg-muted flex items-center justify-center shadow-sm">
                        {produto.imagem_url ? (
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="h-24 w-16 overflow-hidden rounded-md border bg-muted flex items-center justify-center grayscale">
                      {produto.imagem_url ? (
                        <img src={produto.imagem_url} alt={produto.nome} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                      )}
                    </div>
                  )}
                </TableCell>

                {/* COLUNA NOME + PLATAFORMA + SINOPSE */}
                <TableCell>
                  <div className="max-w-[250px] space-y-1">
                    <div>
                      <p className="font-bold text-base leading-none">{produto.nome}</p>
                      {produto.plataforma && (
                        <div className="flex items-center gap-1 mt-1">
                          <MonitorPlay className="h-3 w-3 text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            {produto.plataforma}
                          </span>
                        </div>
                      )}
                    </div>
                    {produto.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        {produto.descricao}
                      </p>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className="font-normal capitalize">
                    {produto.grupo_nome || "Sem Grupo"}
                  </Badge>
                </TableCell>

                <TableCell className="font-semibold text-primary text-nowrap">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(Number(produto.preco))}
                </TableCell>

                <TableCell>
                  <Badge variant={produto.ativo ? "default" : "secondary"}>
                    {produto.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>

                <TableCell className="text-[10px] uppercase text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(produto.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </TableCell>

                {/* AÇÕES LADO A LADO */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      asChild
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                    >
                      <Link href={`/dashboard/vendas/nova?produto_id=${produto.id}`}>
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Vender
                      </Link>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Ações</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/produtos/${produto.id}/editar`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Configurar
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(produto.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* DIÁLOGO DE EXCLUSÃO */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover série da sua lista?</AlertDialogTitle>
            <AlertDialogDescription>
              A série continuará existindo no catálogo global, mas não aparecerá mais na sua gestão privada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removendo..." : "Confirmar Remoção"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}