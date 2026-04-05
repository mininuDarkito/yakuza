"use client"

import { useState, Fragment } from "react"
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
import { 
  Pencil, Trash2, BookOpen, ImageIcon, 
  CopyPlus, MonitorPlay, Globe, 
  ChevronDown, ChevronUp, Layers3, Loader2
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Tipagem base que vem da API
interface ProdutoRaw {
  id: string // ID do vínculo (user_series)
  produto_id: string // ID global do produto
  nome: string
  descricao: string | null
  preco: string | number
  ativo: boolean
  grupo_nome: string
  created_at: string
  imagem_url: string | null
  link_serie: string | null
  plataforma: string | null
}

// Tipagem para o estado agrupado
interface ProdutoAgrupado {
  produto_id: string
  nome: string
  imagem_url: string | null
  link_serie: string | null
  plataforma: string | null
  descricao: string | null
  vincos: ProdutoRaw[]
}

export function ProdutosList({ produtos }: { produtos: ProdutoRaw[] }) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState("")
  const [filterPlataforma, setFilterPlataforma] = useState("todos")
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (produtoId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [produtoId]: !prev[produtoId]
    }))
  }

  // Lógica de agrupamento por obra
  const produtosAgrupados = produtos.reduce((acc, current) => {
    if (!acc[current.produto_id]) {
      acc[current.produto_id] = {
        produto_id: current.produto_id,
        nome: current.nome,
        imagem_url: current.imagem_url,
        link_serie: current.link_serie,
        plataforma: current.plataforma,
        descricao: current.descricao,
        vincos: []
      }
    }
    acc[current.produto_id].vincos.push(current)
    return acc
  }, {} as Record<string, ProdutoAgrupado>)

  const listaAgrupada = Object.values(produtosAgrupados)

  const produtosFiltrados = listaAgrupada.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(search.toLowerCase())
    const matchesPlataforma = filterPlataforma === "todos" || p.plataforma === filterPlataforma
    return matchesSearch && matchesPlataforma
  })

  const plataformasDisponiveis = Array.from(
    new Set(produtos.map((p) => p.plataforma).filter((plat): plat is string => !!plat))
  ).sort()

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/produtos/${deleteId}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      })
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Erro ao remover vínculo")
      
      toast.success("Vínculo removido com sucesso!")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar exclusão")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (produtos.length === 0) {
    return (
      <Card className="bg-zinc-950/50 border-white/5 rounded-[2rem]">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-zinc-700 mb-4" />
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Catálogo Vazio</h3>
          <p className="text-zinc-500 text-sm mb-6 max-w-xs italic font-medium">
            Cadastre novas obras para começar a gerenciar seus preços por grupo.
          </p>
          <Button asChild className="font-black uppercase italic bg-primary text-black rounded-xl">
            <Link href="/dashboard/produtos/novo">Cadastrar Obra</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white/[0.02] p-4 rounded-[1.5rem] border border-white/5 shadow-2xl backdrop-blur-md">
        <div className="relative flex-1 max-w-md w-full">
          <Input
            placeholder="PESQUISAR OBRA NO CATÁLOGO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-black/40 border-white/10 font-bold italic uppercase text-xs tracking-widest text-white"
          />
          <BookOpen className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
        </div>

        <Select value={filterPlataforma} onValueChange={setFilterPlataforma}>
          <SelectTrigger className="w-full sm:w-[220px] h-11 bg-black/40 border-white/10 font-black italic uppercase text-[10px] text-zinc-400">
            <SelectValue placeholder="PLATAFORMA" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value="todos" className="font-bold italic uppercase text-[10px]">TODAS</SelectItem>
            {plataformasDisponiveis.map((plat) => (
              <SelectItem key={plat} value={plat} className="font-bold italic uppercase text-[10px]">{plat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABELA AGRUPADA */}
      <Card className="bg-zinc-950/40 border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[80px] font-black uppercase italic text-[10px] text-zinc-500">Capa</TableHead>
              <TableHead className="font-black uppercase italic text-[10px] text-zinc-500">Obra / Origem</TableHead>
              <TableHead className="font-black uppercase italic text-[10px] text-zinc-500 text-center">Grupos Ativos</TableHead>
              <TableHead className="text-right w-[120px] font-black uppercase italic text-[10px] text-zinc-500">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosFiltrados.map((produto) => {
              const isExpanded = expandedRows[produto.produto_id]
              const temMultiplosGrupos = produto.vincos.length > 0

              return (
                <Fragment key={produto.produto_id}>
                  <TableRow className="border-white/5 group hover:bg-white/[0.01] transition-colors">
                    <TableCell>
                      {temMultiplosGrupos && (
                        <Button variant="ghost" size="icon" onClick={() => toggleRow(produto.produto_id)} className="text-zinc-500 hover:text-white">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </Button>
                      )}
                    </TableCell>
                    
                    <TableCell className="py-4">
                      <div className="relative h-20 w-14 overflow-hidden rounded-xl border-2 border-white/5 bg-zinc-900 shadow-xl">
                        {produto.imagem_url ? (
                          <img src={produto.imagem_url} alt={produto.nome} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-20"><ImageIcon /></div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <p className="font-black text-lg tracking-tighter uppercase italic text-white leading-tight">{produto.nome}</p>
                        {produto.plataforma && (
                          <div className="flex items-center gap-1.5">
                            <MonitorPlay size={10} className="text-primary" />
                            <span className="text-[9px] font-black uppercase italic tracking-widest text-primary/80">{produto.plataforma}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="gap-1.5 font-bold italic border-white/10 text-zinc-400">
                        <Layers3 size={12} />
                        {produto.vincos.length} {produto.vincos.length === 1 ? 'Grupo' : 'Grupos'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                       <Button size="sm" variant="ghost" asChild className="h-9 w-9 p-0 hover:bg-primary/20 hover:text-primary rounded-xl transition-all">
                          <Link 
                            href={`/dashboard/produtos/novo?nome=${encodeURIComponent(produto.nome)}&plataforma=${encodeURIComponent(produto.plataforma || '')}&imagem=${encodeURIComponent(produto.imagem_url || '')}&link=${encodeURIComponent(produto.link_serie || '')}`} 
                            title="Registrar em outro grupo"
                          >
                            <CopyPlus size={18} />
                          </Link>
                        </Button>
                    </TableCell>
                  </TableRow>

                  {/* SUB-LISTA DE GRUPOS */}
                  {isExpanded && produto.vincos.map((vinculo) => (
                    <TableRow key={vinculo.id} className="border-white/5 bg-black/30 hover:bg-black/50 transition-colors">
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Globe size={14} className="text-zinc-600" />
                          <span className="text-sm font-bold text-zinc-300 italic">{vinculo.grupo_nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <p className="font-black text-base text-emerald-400 italic">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(vinculo.preco))}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 pr-2">
                          <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0 hover:bg-white/10 rounded-lg">
                            <Link href={`/dashboard/produtos/${vinculo.id}/editar`} title="Editar preço">
                              <Pencil size={14} className="text-zinc-400" />
                            </Link>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => setDeleteId(vinculo.id)}
                            className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black uppercase italic text-white tracking-tighter">
              Confirmar Remoção
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 font-bold italic text-sm">
              Tem certeza que deseja remover esta obra deste grupo específico? 
              Isso não apagará a obra do catálogo global.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="rounded-xl font-bold uppercase italic border-white/10 bg-transparent text-zinc-400 hover:bg-white/5">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="rounded-xl font-black uppercase italic bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-900/20"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover Vínculo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}