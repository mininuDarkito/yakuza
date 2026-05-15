"use client"

import { useState, useEffect } from "react"
import { 
  Trash2, Search, PackageSearch, AlertCircle, Loader2, Database, 
  RefreshCcw, Edit3, Users, Info, ShoppingCart, Globe, Layers, 
  ChevronLeft, ChevronRight, Save, Image as ImageIcon, Plus, X
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

interface GrupoDetalhe {
  grupo_id?: string // Adicionado para facilitar exclusão/edição
  grupo: string
  preco: number | string
  vendedores: string[] | null
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
  detalhe_grupos?: GrupoDetalhe[]
  descricao?: string
  link_serie: string | null
}

export function SeriesManager() {
  const [series, setSeries] = useState<Produto[]>([])
  const [plataformas, setPlataformas] = useState<string[]>([])
  const [filterPlataforma, setFilterPlataforma] = useState("todos")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Produto | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [mergeCandidate, setMergeCandidate] = useState<{ sourceId: string, targetName: string } | null>(null)

  // Estados para Vínculo de Grupo
  const [gruposList, setGruposList] = useState<{ id: string, nome: string }[]>([])
  const [linkingSeries, setLinkingSeries] = useState<Produto | null>(null)
  const [selectedGrupoId, setSelectedGrupoId] = useState("")
  const [newPreco, setNewPreco] = useState("1.00")
  const [isLinking, setIsLinking] = useState(false)

  const fetchSeries = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/produtos?page=${page}&search=${search}&plataforma=${filterPlataforma}`) 
      const data = await res.json()
      setSeries(data.items || [])
      setTotalPages(data.totalPages || 1)
      if (data.plataformas) setPlataformas(data.plataformas)
    } catch (error) {
      toast.error("Erro ao sincronizar catálogo")
    } finally {
      setLoading(false)
    }
  }

  const fetchGrupos = async () => {
    try {
      const res = await fetch('/api/admin/grupos')
      const data = await res.json()
      if (data.success) {
        setGruposList(data.grupos.map((g: any) => ({ id: g.id, nome: g.nome })))
      }
    } catch (e) {}
  }

  useEffect(() => { 
    fetchSeries() 
    fetchGrupos()
  }, [page])

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        if (res.status === 400 && data.error?.includes("já está sendo usado")) {
          setMergeCandidate({ sourceId: editingItem.id, targetName: editingItem.nome })
          return
        }
        throw new Error(data.error || "Erro ao salvar")
      }

      toast.success("Catálogo atualizado com sucesso")
      setEditingItem(null)
      fetchSeries()
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleMerge = async () => {
    if (!mergeCandidate) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/produtos/merge', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: mergeCandidate.sourceId, targetName: mergeCandidate.targetName })
      })

      if (!res.ok) throw new Error("Erro na fusão")
      
      toast.success("Obras unificadas com sucesso!")
      setMergeCandidate(null)
      setEditingItem(null)
      fetchSeries()
    } catch (error) {
      toast.error("Erro ao fundir obras")
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenLinkDialog = (produto: Produto, editGrupo?: GrupoDetalhe) => {
    setLinkingSeries(produto)
    if (editGrupo && editGrupo.grupo_id) {
        setSelectedGrupoId(editGrupo.grupo_id)
        setNewPreco(String(editGrupo.preco))
    } else {
        setSelectedGrupoId("")
        setNewPreco("1.00")
    }
  }

  const handleSaveGroupLink = async () => {
    if (!linkingSeries || !selectedGrupoId) return
    setIsLinking(true)
    try {
      const res = await fetch('/api/admin/series/group-link', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: linkingSeries.id,
          grupo_id: selectedGrupoId,
          preco: Number(newPreco)
        })
      })

      if (!res.ok) throw new Error()
      toast.success("Configuração de grupo salva!")
      setLinkingSeries(null)
      fetchSeries()
    } catch {
      toast.error("Erro ao salvar configuração")
    } finally {
      setIsLinking(false)
    }
  }

  const handleRemoveGroupLink = async (produtoId: string, grupoId: string) => {
    if (!confirm("Remover este grupo da obra? Isso não deletará as vendas já registradas.")) return
    try {
        const res = await fetch(`/api/admin/series/group-link?produto_id=${produtoId}&grupo_id=${grupoId}`, {
            method: "DELETE"
        })
        if (!res.ok) throw new Error()
        toast.success("Vínculo removido")
        fetchSeries()
    } catch {
        toast.error("Erro ao remover vínculo")
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
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-2xl">
          <div className="flex items-center gap-3 flex-1 w-full border-b sm:border-b-0 border-white/5 pb-2 sm:pb-0">
            <Search className="h-5 w-5 text-primary shrink-0" />
            <Input
              placeholder="PESQUISAR NO CATÁLOGO..."
              className="bg-transparent border-none focus-visible:ring-0 font-black regular uppercase text-xs tracking-widest text-white px-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterPlataforma}
              onChange={(e) => setFilterPlataforma(e.target.value)}
              className="h-9 w-full sm:w-[130px] bg-zinc-900 border border-white/10 rounded-xl px-3 text-[10px] font-black text-zinc-400 focus:border-primary outline-none uppercase italic"
            >
              <option value="todos">Plataforma</option>
              {plataformas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button type="submit" variant="secondary" className="h-9 font-black uppercase text-[10px]">Filtrar</Button>
          </div>
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
                        <p className="text-[9px] font-black uppercase regular text-primary flex items-center justify-between">
                          <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> Rastreamento de Vendedores</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 hover:bg-primary hover:text-black rounded-lg transition-all"
                            onClick={() => handleOpenLinkDialog(item)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </p>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                          {item.detalhe_grupos && item.detalhe_grupos.length > 0 ? (
                            item.detalhe_grupos.map((g, idx) => (
                              <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-2 group/row">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-primary italic">{g.grupo}</span>
                                    <span className="text-[11px] font-black text-emerald-500 italic">$ {Number(g.preco || 0).toFixed(2)}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-zinc-400 hover:text-primary hover:bg-primary/10 rounded-lg"
                                      onClick={() => handleOpenLinkDialog(item, g)}
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                                      onClick={() => g.grupo_id && handleRemoveGroupLink(item.id, g.grupo_id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {g.vendedores && g.vendedores.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {g.vendedores.map((v, vIdx) => (
                                      <Badge key={vIdx} variant="secondary" className="text-[8px] py-0 px-1.5 bg-zinc-800 text-zinc-400 border-none font-bold uppercase italic">
                                        {v}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[8px] font-bold text-zinc-600 uppercase italic">Nenhum vendedor vinculado</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <p className="text-[9px] text-center text-zinc-600 uppercase font-black regular">Sem configurações de grupo</p>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[8px] font-black border-dashed border-white/10 hover:bg-white/5 rounded-lg uppercase italic"
                                    onClick={() => handleOpenLinkDialog(item)}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Configurar Primeiro Grupo
                                </Button>
                            </div>
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
              <label className="text-[10px] font-black uppercase text-zinc-500 regular">Link da Serie</label>
              <Input 
                value={editingItem?.link_serie || ""} 
                className="bg-zinc-900 border-white/10 regular font-bold"
                onChange={(e) => setEditingItem(prev => prev ? {...prev, link_serie: e.target.value} : null)}
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
      {/* MODAL DE FUSÃO (MERGE) */}
      <AlertDialog open={!!mergeCandidate} onOpenChange={() => setMergeCandidate(null)}>
        <AlertDialogContent className="bg-zinc-950 border-2 border-primary/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase regular text-primary flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" /> Unificar Obras
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 font-bold uppercase text-[10px] leading-relaxed">
              O nome <span className="text-white">"{mergeCandidate?.targetName}"</span> já existe no catálogo. 
              Deseja <span className="text-primary">FUNDIR</span> esta série com a existente? 
              <br /><br />
              Isso moverá todas as vendas, vendedores e configurações para a série principal e deletará este registro duplicado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-none font-black uppercase regular text-[10px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMerge}
              className="bg-primary hover:bg-primary/80 font-black uppercase regular text-[10px]"
            >
              Sim, Unificar Registros
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE VÍNCULO DE GRUPO */}
      <Dialog open={!!linkingSeries} onOpenChange={() => setLinkingSeries(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-sm rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase italic text-primary tracking-tighter">Configurar Preço por Grupo</DialogTitle>
                <p className="text-[10px] text-zinc-500 font-bold uppercase italic">{linkingSeries?.nome}</p>
            </DialogHeader>

            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase italic text-zinc-500 ml-2">Selecionar Grupo</label>
                    <select 
                        value={selectedGrupoId}
                        onChange={(e) => setSelectedGrupoId(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 h-12 rounded-xl px-4 text-xs font-black uppercase italic outline-none focus:border-primary/50 transition-all"
                    >
                        <option value="" disabled className="bg-zinc-900">Escolha um grupo...</option>
                        {gruposList.map(g => (
                            <option key={g.id} value={g.id} className="bg-zinc-900">{g.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase italic text-zinc-500 ml-2">Preço por Capítulo ($)</label>
                    <Input 
                        type="number"
                        step="0.01"
                        value={newPreco}
                        onChange={(e) => setNewPreco(e.target.value)}
                        className="bg-zinc-900 border-white/10 h-12 rounded-xl font-black italic text-emerald-400 text-lg"
                    />
                </div>
            </div>

            <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setLinkingSeries(null)} className="font-black uppercase italic text-xs rounded-xl">
                    <X size={14} className="mr-2" /> Cancelar
                </Button>
                <Button 
                    disabled={isLinking || !selectedGrupoId}
                    onClick={handleSaveGroupLink}
                    className="bg-primary text-black font-black uppercase italic text-xs rounded-xl px-6"
                >
                    {isLinking ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                    Vincular Grupo
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}