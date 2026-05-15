"use client"

import { useState, useEffect, useMemo } from "react"
import { format } from "date-fns"
import {
  ImagePlus, MoreHorizontal, Trash2, Lock,
  ChevronDown, ChevronUp, Layers, Search, Loader2,
  Users, PlusCircle, Edit3, Save, X
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

import { VendasStats } from "@/components/dashboard/vendas/VendasStats"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

// --- INTERFACES ---
interface Grupo { nome: string }
interface Produto {
  id: string
  nome: string
  nome_alternativo?: string
  imagem_url?: string
  plataforma?: string
}
interface Venda {
  id: string
  capitulo: number // Representa o número do capítulo no seu banco (campo real)
  preco_total: string | number
  data_venda: string
  lock_user: boolean
  lock_admin: boolean
  produto: Produto
  grupo: Grupo
  produto_id: string
}

export function VendasList({
  userId: initialUserId,
  initialMes,
  initialAno
}: {
  userId: string,
  initialMes?: string,
  initialAno?: string
}) {
  const { data: session } = useSession()
  const router = useRouter()

  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<{ id: string, discord_username: string }[]>([])

  const [mes, setMes] = useState(initialMes ? Number(initialMes) : new Date().getMonth() + 1)
  const [ano, setAno] = useState(initialAno ? Number(initialAno) : new Date().getFullYear())

  const [expandedSeries, setExpandedSeries] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [plataformaFilter, setPlataformaFilter] = useState("todas")
  const [grupoFilter, setGrupoFilter] = useState("todas")
  const [selectedUserId, setSelectedUserId] = useState(initialUserId)

  // Estados para Edição
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    capitulo: 0,
    preco_unitario: 0,
    data_venda: "",
    obs: ""
  })

  // Carrega lista de usuários para Admin
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetch('/api/admin/user/list')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setUsuarios(data)
        })
        .catch(() => setUsuarios([]))
    }
  }, [session])

  // Carrega as vendas baseadas nos filtros de tempo e usuário
  useEffect(() => {
    async function loadVendas() {
      setLoading(true)
      try {
        const res = await fetch(`/api/user/venda/list?user_id=${selectedUserId}&mes=${mes}&ano=${ano}`)
        if (!res.ok) throw new Error("Erro ao carregar")
        const data = await res.json()
        setVendas(data || [])
      } catch (error) {
        toast.error("Não foi possível carregar o extrato")
      } finally {
        setLoading(false)
      }
    }
    if (selectedUserId) loadVendas()
  }, [selectedUserId, mes, ano])

  // Filtros de Front-end
  const filteredVendas = useMemo(() => {
    return (vendas || []).filter(venda => {
      const nomePrincipal = (venda?.produto?.nome || "").toLowerCase();
      const nomeAlt = (venda?.produto?.nome_alternativo || "").toLowerCase();
      const busca = searchTerm.toLowerCase();

      const matchesSearch = nomePrincipal.includes(busca) || nomeAlt.includes(busca);
      const plataformaVenda = venda?.produto?.plataforma || "Outros";
      const grupoNome = venda?.grupo?.nome || "outros";

      const matchesPlataforma = plataformaFilter === "todas" || plataformaVenda === plataformaFilter;
      const matchesGrupo = grupoFilter === "todas" || grupoNome === grupoFilter;

      return matchesSearch && matchesPlataforma && matchesGrupo;
    });
  }, [vendas, searchTerm, plataformaFilter, grupoFilter]);

  // Agrupamento por Série para exibição em Accordion
  const series = useMemo(() => {
    const grouped = filteredVendas.reduce((acc: any, venda) => {
      const key = venda?.produto?.nome || "Sem Nome"
      const realProdutoId = venda.produto_id || venda.produto?.id;

      if (!acc[key]) {
        acc[key] = {
          nome: key,
          produto_id: realProdutoId,
          nome_alternativo: venda?.produto?.nome_alternativo,
          imagem: venda?.produto?.imagem_url,
          totalFaturado: 0,
          itens: []
        }
      }
      acc[key].itens.push(venda)
      acc[key].totalFaturado += Number(venda.preco_total || 0)
      return acc
    }, {})
    return Object.values(grouped);
  }, [filteredVendas]);

  // Metadados para os Selects de Filtro
  const gruposDisponiveis = Array.from(new Set(vendas.map(v => v?.grupo?.nome).filter(Boolean)));

  // Cálculos de Stats
  const totalFaturado = filteredVendas.reduce((acc, v) => acc + Number(v.preco_total || 0), 0);
  const totalCapitulos = filteredVendas.length;
  const mediaPorCapitulo = totalCapitulos > 0 ? totalFaturado / totalCapitulos : 0;
  const quantidadeSeries = series.length;

  const toggleSerie = (nome: string) => {
    setExpandedSeries(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome])
  }

  const handleDelete = async (venda: Venda) => {
    if (venda.lock_user || venda.lock_admin) return toast.error("Registro trancado.")
    if (!confirm("Excluir este capítulo?")) return
    try {
      const res = await fetch(`/api/vendas/${venda.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Removido")
      setVendas(prev => prev.filter(v => v.id !== venda.id))
    } catch { toast.error("Erro ao remover") }
  }

  const handleEditClick = (venda: Venda) => {
    setEditingVenda(venda)
    setEditForm({
      capitulo: Number(venda.capitulo),
      preco_unitario: Number(venda.preco_total),
      data_venda: new Date(venda.data_venda).toISOString().split('T')[0],
      obs: "" // Opcional, o backend trata
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingVenda) return
    setIsUpdating(true)
    try {
      const res = await fetch("/api/user/venda/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVenda.id,
          ...editForm
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Erro ao atualizar")

      toast.success("Venda atualizada!")
      setVendas(prev => prev.map(v => v.id === editingVenda.id ? { ...v, ...result.venda, capitulo: Number(result.venda.capitulo) } : v))
      setIsEditDialogOpen(false)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs font-black uppercase italic text-zinc-500">Sincronizando Acervo...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <VendasStats
        totalFaturado={totalFaturado}
        totalCapitulos={totalCapitulos}
        mediaPorCapitulo={mediaPorCapitulo}
        quantidadeSeries={quantidadeSeries}
      />

      {/* BARRA DE FERRAMENTAS */}
      <div className="flex flex-col md:flex-row gap-4 shadow-sm bg-muted/20 p-4 rounded-[2rem] border border-white/5">
        {session?.user?.role === 'admin' && (
          <div className="flex items-center gap-2 px-3 rounded-xl border border-white/10 h-11 bg-black/20">
            <Users size={14} className="text-primary" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-[10px] font-black uppercase italic outline-none bg-transparent"
            >
              {usuarios.map(u => (
                <option key={u.id} value={u.id} className="bg-zinc-900">{u.discord_username}</option>
              ))}
            </select>
          </div>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="PESQUISAR SÉRIE..."
            className="pl-10 bg-black/20 border-white/10 h-11 text-xs font-black italic uppercase tracking-widest rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="bg-black/20 border border-white/10 rounded-xl px-3 text-[10px] font-black uppercase italic"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1} className="bg-zinc-900">
                {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
              </option>
            ))}
          </select>

          <select
            value={grupoFilter}
            onChange={(e) => setGrupoFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-3 text-[10px] font-black uppercase italic min-w-[120px]"
          >
            <option value="todas">TODOS GRUPOS</option>
            {gruposDisponiveis.map(g => (
              <option key={g as string} value={g as string} className="bg-zinc-900">{g as string}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA DE SÉRIES */}
      <div className="space-y-3">
        {series.length > 0 ? series.map((group: any) => (
          <div key={group.nome} className="rounded-[1.5rem] border-2 bg-muted/50 overflow-hidden transition-all hover:border-white/10 shadow-lg border-white/5">
            <div
              onClick={() => toggleSerie(group.nome)}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-10 rounded-xl overflow-hidden border-2 border-white/5 bg-muted shadow-2xl">
                  {group.imagem ? (
                    <img src={group.imagem} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><ImagePlus size={16} className="opacity-20" /></div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-base uppercase italic leading-tight">{group.nome}</h3>
                  <p className="text-[10px] font-bold text-primary uppercase mt-1 flex items-center gap-1.5 italic leading-none">
                    <Layers size={10} /> {group.itens.length} CAPÍTULOS LANÇADOS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                {/* BOTÃO DE AÇÃO RÁPIDA - LANÇAR MAIS CAPÍTULOS */}
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="h-10 w-10 p-0 hover:bg-primary hover:text-black rounded-2xl transition-all border border-primary/20 bg-primary/5 text-primary shadow-inner"
                  onClick={(e) => e.stopPropagation()} // Impede de abrir a lista ao clicar no botão
                >
                  <Link
                    href={`/dashboard/vendas/nova?produto_id=${group.produto_id}`}
                    title="Lançar Capítulos em Massa"
                  >
                    <PlusCircle size={20} />
                  </Link>
                </Button>

                <div className="text-right">
                  <p className="text-[9px] font-black uppercase mb-0.5 opacity-40 italic leading-none text-zinc-400">Acumulado</p>
                  <p className="text-lg font-black text-emerald-400 italic tracking-tighter leading-none">
                    $ {group.totalFaturado.toFixed(2)}
                  </p>
                </div>
                <div className="text-zinc-600">
                  {expandedSeries.includes(group.nome) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {/* TABELA DE ITENS INDIVIDUAIS (CAPÍTULOS) */}
            {expandedSeries.includes(group.nome) && (
              <div className="border-t border-white/5 bg-black/40 animate-in slide-in-from-top-2 duration-300">
                <table className="w-full">
                  <thead className="text-[10px] font-black uppercase bg-white/[0.02]">
                    <tr>
                      <th className="px-6 py-3 text-left italic text-zinc-500 tracking-widest uppercase">Data</th>
                      <th className="px-6 py-3 text-left italic text-zinc-500 tracking-widest uppercase">Grupo</th>
                      <th className="px-6 py-3 text-center italic text-zinc-500 tracking-widest uppercase">Cap.</th>
                      <th className="px-6 py-3 text-right italic text-zinc-500 tracking-widest uppercase">Valor</th>
                      <th className="px-6 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {group.itens.map((venda: Venda) => {
                      const isLocked = venda.lock_user || venda.lock_admin;
                      return (
                        <tr key={venda.id} className={cn("transition-colors", isLocked ? "opacity-30" : "hover:bg-white/[0.03]")}>
                          <td className="px-6 py-4 text-[11px] font-bold text-zinc-300 italic uppercase">
                            {venda.data_venda ? new Date(venda.data_venda).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }) : "--/--/--"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black uppercase text-zinc-400 italic">
                              {venda?.grupo?.nome || "GLOBAL"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm font-black italic text-foreground">
                            #{venda.capitulo}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm font-black text-emerald-400">
                            $ {Number(venda.preco_total).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!isLocked ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-xl text-zinc-500">
                                    <MoreHorizontal size={16} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 rounded-xl shadow-2xl">
                                  <DropdownMenuItem
                                    className="text-zinc-300 font-black text-[10px] uppercase italic focus:bg-white/10 cursor-pointer p-3"
                                    onClick={() => handleEditClick(venda)}
                                  >
                                    <Edit3 className="mr-2 h-3 w-3" /> Editar Registro
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-500 font-black text-[10px] uppercase italic focus:bg-red-500/10 focus:text-red-500 cursor-pointer p-3"
                                    onClick={() => handleDelete(venda)}
                                  >
                                    <Trash2 className="mr-2 h-3 w-3" /> Excluir Registro
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : <Lock size={12} className="mx-auto text-zinc-700" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )) : (
          <div className="py-24 border-2 border-dashed border-white/5 rounded-[3rem] text-center bg-zinc-950/20">
            <p className="font-black uppercase italic text-xs tracking-[0.3em] text-zinc-600">Nenhum faturamento registrado para este período</p>
          </div>
        )}
      </div>
      {/* DIÁLOGO DE EDIÇÃO */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] shadow-2xl text-white">
          <DialogHeader>
            <DialogTitle className="font-black uppercase italic text-2xl text-primary tracking-tighter">
              Ajustar Registro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase italic text-zinc-500 ml-2">Capítulo</label>
                <Input
                  type="number"
                  value={editForm.capitulo}
                  onChange={(e) => setEditForm({ ...editForm, capitulo: Number(e.target.value) })}
                  className="bg-zinc-900 border-white/10 h-12 rounded-xl font-black italic"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase italic text-zinc-500 ml-2">Valor Unit.</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.preco_unitario}
                  onChange={(e) => setEditForm({ ...editForm, preco_unitario: Number(e.target.value) })}
                  className="bg-zinc-900 border-white/10 h-12 rounded-xl font-black italic text-emerald-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase italic text-zinc-500 ml-2">Data do Lançamento</label>
              <Input
                type="date"
                value={editForm.data_venda}
                onChange={(e) => setEditForm({ ...editForm, data_venda: e.target.value })}
                className="bg-zinc-900 border-white/10 h-12 rounded-xl font-black italic"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
              className="font-black uppercase italic text-xs rounded-xl"
            >
              <X size={16} className="mr-2" /> Cancelar
            </Button>
            <Button
              disabled={isUpdating}
              onClick={handleUpdate}
              className="bg-primary text-black font-black uppercase italic text-xs rounded-xl px-6 shadow-lg shadow-primary/20"
            >
              {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="mr-2" />}
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}