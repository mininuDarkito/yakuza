"use client"

import { useState, useEffect } from "react"
import { 
  Trash2, Search, PackageSearch, AlertCircle, Loader2, Database, 
  RefreshCcw, Edit3, Users, Info, ShoppingCart, Globe, Layers, 
  ChevronLeft, ChevronRight, Save, Image as ImageIcon
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Vendedor {
  vendedor: string
  grupo: string
  avatar?: string
  discord_id?: string
}

interface Produto {
  id: string
  nome: string
  nome_alternativo?: string
  plataforma: string
  imagem_url?: string
  total_vendas_count: number
  total_vendedores: number
  total_grupos: number
  detalhe_vendedores?: Vendedor[]
  descricao?: string
  link_series: string | null
}

export function SeriesManager() {
  const [series, setSeries] = useState<Produto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Produto | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null) // Estado adicionado

  const fetchSeries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/produtos?page=${page}&search=${search}`) 
      const data = await res.json()
      setSeries(data.items || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      toast.error("Erro ao sincronizar catálogo")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSeries() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchSeries()
  }

  const handleUpdate = async () => {
    if (!editingItem) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/admin/produtos/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify(editingItem)
      })
      if (!res.ok) throw new Error()
      toast.success("Catálogo atualizado com sucesso")
      setEditingItem(null)
      fetchSeries()
    } catch {
      toast.error("Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const res = await fetch(`/api/admin/produtos/${id}`, { 
        method: "DELETE" 
      })

      if (!res.ok) throw new Error()

      setSeries((prev) => prev.filter((s) => s.id !== id))
      toast.success("Série eliminada da Yakuza")
      if (expandedId === id) setExpandedId(null)
    } catch (error) {
      toast.error("Erro ao excluir: A obra possui vínculos ativos")
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* TOOLBAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-white/5 shadow-2xl">
        <form onSubmit={handleSearch} className="flex items-center gap-3 w-full md:max-w-md">
          <Search className="h-5 w-5 text-primary" />
          <Input
            placeholder="PESQUISAR NO CATÁLOGO..."
            className="bg-transparent border-none focus-visible:ring-0 font-black regular uppercase text-xs tracking-widest text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Button variant="ghost" size="sm" onClick={fetchSeries} className="text-[10px] font-black uppercase regular hover:bg-white/5">
          <RefreshCcw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-black regular uppercase text-xs animate-pulse">Acessando Yakuza...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            {series.map((item) => (
              <Card key={item.id} className={`bg-zinc-900/40 border-2 border-white/5 transition-all duration-300 overflow-hidden group ${expandedId === item.id ? 'lg:col-span-2 ring-2 ring-primary/40' : 'hover:border-primary/40'}`}>
                <div className="relative aspect-video bg-zinc-900 border-b border-white/5">
                  <img src={item.imagem_url || "/placeholder-serie.jpg"} alt={item.nome} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge className="bg-black/80 text-[8px] font-black regular border-primary/20 uppercase">{item.plataforma}</Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="min-h-[40px]">
                    <h3 className="font-black regular uppercase text-xs truncate text-white">{item.nome}</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase truncate">{item.nome_alternativo || "---"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-y border-white/5 py-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-black regular text-zinc-400">
                      <ShoppingCart className="h-3 w-3 text-emerald-500" /> {item.total_vendas_count} VENDAS
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black regular text-zinc-400">
                      <Users className="h-3 w-3 text-primary" /> {item.total_vendedores} SELLERS
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <Button 
                      variant="secondary" 
                      className="flex-1 h-7 text-[9px] font-black uppercase regular"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      {expandedId === item.id ? "FECHAR" : "MAIS INFO"}
                    </Button>
                    
                    <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-400 border-white/10 hover:text-blue-400 transition-colors" onClick={() => setEditingItem(item)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>

                    {/* ALERT DIALOG PARA EXCLUSÃO */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-7 w-7 text-zinc-400 border-white/10 hover:text-red-500 transition-colors" disabled={isDeleting === item.id}>
                          {isDeleting === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-zinc-950 border-2 border-red-500/50">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-black uppercase regular text-red-500 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" /> Exclusão Global
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-zinc-400 font-bold uppercase text-[10px] leading-relaxed">
                            Atenção Admin: Você está prestes a deletar <span className="text-white">"{item.nome}"</span>. 
                            Isso removerá a obra de todos os vendedores e grupos instantaneamente. 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-zinc-900 border-none font-black uppercase regular text-[10px]">Abortar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700 font-black uppercase regular text-[10px]"
                          >
                            Confirmar Exclusão
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {expandedId === item.id && (
                    <div className="pt-4 mt-2 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <p className="text-[8px] font-black text-zinc-500 uppercase regular">Total de Grupos</p>
                          <p className="text-sm font-black regular text-primary">{item.total_grupos}</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5 text-right">
                          <p className="text-[8px] font-black text-zinc-500 uppercase regular">ID Catálogo</p>
                          <p className="text-[9px] font-mono text-zinc-400">{item.id.slice(0,8)}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase regular text-primary flex items-center gap-1">
                          <Layers className="h-3 w-3" /> Rastreamento de Vendedores
                        </p>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {item.detalhe_vendedores && item.detalhe_vendedores.length > 0 ? (
                            item.detalhe_vendedores.map((v, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/5">
                                <span className="text-[10px] font-black uppercase regular">{v.vendedor}</span>
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">{v.grupo}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[9px] text-center text-zinc-600 py-2 uppercase font-black regular">Sem vendedores ativos</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center items-center gap-2 pt-10">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="font-black uppercase regular text-[10px]">
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={page === n ? "default" : "outline"}
                  className={`h-8 w-8 text-[10px] font-black ${page === n ? 'bg-primary border-none shadow-lg' : 'border-white/10'}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="font-black uppercase regular text-[10px]">
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}

      {/* MODAL DE EDIÇÃO GLOBAL */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase regular text-primary tracking-tighter">Editar Metadados Globais</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-500 regular">Capa da série</label>
           
              
              <img src={editingItem?.imagem_url || "/placeholder-serie.jpg" } alt={editingItem?.nome}  className="object-cover w-full h-40 mt-2 rounded" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-500 regular">Nome Oficial</label>
              <Input 
                value={editingItem?.nome || ""} 
                className="bg-zinc-900 border-white/10 regular font-bold"
                onChange={(e) => setEditingItem(prev => prev ? {...prev, nome: e.target.value} : null)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-500 regular">Nome Alternativo</label>
              <Input 
                value={editingItem?.nome_alternativo || ""} 
                className="bg-zinc-900 border-white/10 regular font-bold"
                onChange={(e) => setEditingItem(prev => prev ? {...prev, nome_alternativo: e.target.value} : null)}
              />
            </div>

            <div className="space-y-1">
              <label className="min-h-100 font-black uppercase text-zinc-500 regular">Sinopse</label>
              <Input 
                value={editingItem?.descricao || ""} 
                className="bg-zinc-900 text-[100px] border-white/10 regular font-bold"
                onChange={(e) => setEditingItem(prev => prev ? {...prev, descricao: e.target.value} : null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 regular">Plataforma</label>
                <Input 
                  value={editingItem?.plataforma || ""} 
                  className="bg-zinc-900 border-white/10 regular font-bold uppercase"
                  onChange={(e) => setEditingItem(prev => prev ? {...prev, plataforma: e.target.value} : null)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-500 regular">Capa (URL)</label>
                <Input 
                  value={editingItem?.imagem_url || ""} 
                  className="bg-zinc-900 border-white/10 regular font-bold"
                  onChange={(e) => setEditingItem(prev => prev ? {...prev, imagem_url: e.target.value} : null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="font-black uppercase regular text-[10px]" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button className="bg-primary font-black uppercase regular text-[10px]" onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}