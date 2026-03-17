"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  ImagePlus, MoreHorizontal, Trash2, Lock,
  ChevronDown, ChevronUp, Layers, Search, Globe, Loader2,
  Group
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import { ptBR } from 'date-fns/locale';

import { VendasStats } from "@/components/dashboard/vendas/VendasStats"

import { useSession } from "next-auth/react" // Importe para verificar a role
import { string } from "zod"

// --- INTERFACES (O CONTRATO) ---
interface Grupo {
  nome: string
}

interface Produto {
  id: string
  nome: string
  nome_alternativo?: string
  imagem_url?: string
  plataforma?: string
}

interface Venda {
  id: string
  quantidade: number
  preco_total: string | number
  data_venda: string
  lock_user: boolean
  lock_admin: boolean
  produto: Produto
  grupo: Grupo
}

interface User {
  id: string
  discord_username: string
  discord_id: string
}

export function VendasList({ userId: initialUserId }: { userId: string, initialMes: string, initialAno: string }) {

  const { data: session } = useSession()
  const router = useRouter()

  // Estados de Dados
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)

  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())

  // Estados de UI

  const [expandedSeries, setExpandedSeries] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [plataformaFilter, setPlataformaFilter] = useState("todas")
  const [grupoFilter, setGrupoFilter] = useState("todas")
  const [selectedUserId, setSelectedUserId] = useState(initialUserId)
  const [usuarios, setUsuarios] = useState<{id: string, name: string}[]>([])


  // 2. Busca a lista de usuários (APENAS SE FOR ADMIN)
useEffect(() => {
  if (session?.user?.role === 'admin') {
    fetch('/api/admin/user/list')
      .then(res => res.json())
      .then(data => {
        // PROTEÇÃO: Só atualiza se o que vier da API for realmente uma Array
        if (Array.isArray(data)) {
          setUsuarios(data)
        } else {
          console.error("API de usuários não retornou uma array:", data)
          setUsuarios([]) // Volta para array vazia se der erro
        }
      })
      .catch(() => setUsuarios([]))
  }
}, [session])

  // --- FETCH DOS DADOS ---
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

  // --- LÓGICA DE FILTRAGEM (Blindada) ---
  const filteredVendas = (vendas || []).filter(venda => {
    const nomePrincipal = (venda?.produto?.nome || "").toLowerCase();
    const nomeAlt = (venda?.produto?.nome_alternativo || "").toLowerCase();
    const busca = searchTerm.toLowerCase();

    const matchesSearch = nomePrincipal.includes(busca) || nomeAlt.includes(busca);
    const plataformaVenda = venda?.produto?.plataforma || "Outros";
    const grupoVariado = venda.grupo.nome || "outros";
    const matchesPlataforma = plataformaFilter === "todas" || plataformaVenda === plataformaFilter;
    const matchesGrupo = grupoFilter === "todas" || grupoVariado === grupoFilter;

    return matchesSearch && matchesPlataforma && matchesGrupo;
  });

  // --- LÓGICA DE AGRUPAMENTO ---
  const groupedVendas = filteredVendas.reduce((acc: any, venda) => {
    const key = venda?.produto?.nome || "Sem Nome"
    if (!acc[key]) {
      acc[key] = {
        nome: key,
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

  const series = Object.values(groupedVendas)
  const plataformas = Array.from(new Set(vendas.map(v => v?.produto?.plataforma).filter(Boolean)));
  const grupos = Array.from(new Set(vendas.map(v => v?.grupo.nome).filter(Boolean)));

  const toggleSerie = (nome: string) => {
    setExpandedSeries(prev =>
      prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome]
    )
  }

  const handleDelete = async (venda: Venda) => {
    if (venda.lock_user || venda.lock_admin) {
      toast.error("Registro trancado.")
      return
    }
    if (!confirm("Excluir este capítulo?")) return

    try {
      const res = await fetch(`/api/user/vendas/delete?id=${venda.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Removido")

      // Atualiza a lista local removendo a venda deletada
      setVendas(prev => prev.filter(v => v.id !== venda.id))
    } catch (error) {
      toast.error("Erro ao remover")
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-xs font-black uppercase italic">Sincronizando Acervo...</p>
    </div>
  )

  const totalFaturado = filteredVendas.reduce((acc, v) => acc + Number(v.preco_total || 0), 0);
const totalCapitulos = filteredVendas.length;
const mediaPorCapitulo = totalCapitulos > 0 ? totalFaturado / totalCapitulos : 0;
const quantidadeSeries = series.length;

  return (
    <div className="space-y-6">

      {/* 1. O NOVO TOTALIZADOR */}
    <VendasStats 
       totalFaturado={totalFaturado}
       totalCapitulos={totalCapitulos}
       mediaPorCapitulo={mediaPorCapitulo}
       quantidadeSeries={quantidadeSeries}
    />
      {/* BARRA DE FERRAMENTAS */}

      
      <div className="flex flex-col md:flex-row gap-4 border shadow-sm bg-muted/20 p-4 rounded-[2rem] border-muted/50">
        {/* SELETOR DE USUÁRIO (VISÍVEL APENAS PARA ADMIN) */}
        {session?.user?.role === 'admin' && (
          <div className="flex items-center gap-2 px-3 rounded-xl border border-primary/20 h-11">
            <span className="text-[10px] font-black text-primary uppercase italic">User:</span>
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="text-[10px] bg-muted/80 font-black uppercase italic outline-none  min-w-[100px]"
            >
              {usuarios.map(u => (
                <option key={u.id} value={u.id} className="">
                  {u.discord_username}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou nome alternativo..."
            className="pl-9 bg-muted/50 border-none h-11 text-xs font-bold italic"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Filtro de Mês */}
        <div className="flex items-center gap-2 bg-muted/50 px-3 rounded-xl border border-white/5 h-11">
          <span className="text-[10px] font-black  uppercase italic">Mês:</span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="bg-muted/80 text-[10px] font-black uppercase italic outline-none flex-1 "
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1} className="">
                {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Ano */}
        <div className="flex items-center gap-2 bg-muted/50 px-3 rounded-xl border border-white/5 h-11">
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="bg-muted/80 text-[10px] font-black uppercase italic outline-none flex-1 "
          >
            {[2024, 2025, 2026].map(v => (
              <option key={v} value={v} className="">{v}</option>
            ))}
          </select>
        </div>


        <div className="flex items-center gap-2 bg-muted/50 px-3 rounded-xl border border-white/5 h-11">
          <Group size={14} />
          <select
            value={grupoFilter}
            onChange={(e) => setGrupoFilter(e.target.value)}
            className="bg-muted/80 text-[10px] font-black uppercase italic outline-none min-w-[120px]"
          >
            <option value="todas" className="">Grupos</option>
            {grupos.map(plat => (
              <option key={plat as string} value={plat as string} className="">
                {plat as string}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-muted/50 px-3 rounded-xl border border-white/5 h-11">
          <Globe size={14} />
          <select
            value={plataformaFilter}
            onChange={(e) => setPlataformaFilter(e.target.value)}
            className="bg-muted/80 text-[10px] font-black uppercase italic outline-none min-w-[120px]"
          >
            <option value="todas" className="">Todas Plataformas</option>
            {plataformas.map(plat => (
              <option key={plat as string} value={plat as string} className="">
                {plat as string}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3" >
        {series.length > 0 ? series.map((group: any) => (
          <div key={group.nome} className="rounded-[1.5rem] border shadow-sm bg-muted/20 overflow-hidden transition-all">
            <div
              onClick={() => toggleSerie(group.nome)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-9 rounded-lg overflow-hidden border border-white/10 bg-muted/50 shadow-xl">
                  {group.imagem ? (
                    <img src={group.imagem} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center "><ImagePlus size={14} /></div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase italic leading-none">{group.nome}</h3>
                  {group.nome_alternativo && (
                    <p className="text-[9px] font-bold  uppercase mt-1 italic">{group.nome_alternativo}</p>
                  )}
                  <p className="text-[10px] font-bold text-primary uppercase mt-1 flex items-center gap-1 leading-none">
                    <Layers size={10} /> {group.itens.length} capítulos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[8px] font-black  uppercase mb-1 leading-none">Acumulado</p>
                  <p className="text-sm font-black text-emerald-500 italic">
                    $ {group.totalFaturado.toFixed(2)}
                  </p>
                </div>
                {expandedSeries.includes(group.nome) ? <ChevronUp size={16} className="" /> : <ChevronDown size={16} className="" />}
              </div>
            </div>

            {expandedSeries.includes(group.nome) && (
              <div className="border-t border-white/5 bg-muted/50 animate-in slide-in-from-top-2 duration-300">
                <table className="w-full ">
                  <thead className="text-[9px] font-black uppercase border-b border-white/5">
                    <tr className="">
                      <th className="px-4 py-2 text-left font-black italic">Data</th>
                      <th className="px-4 py-2 text-left font-black italic">Plataforma / Grupo</th>
                      <th className="px-4 py-2 text-center font-black italic">Cap.</th>
                      <th className="px-4 py-2 text-right font-black italic">Valor</th>
                      <th className="px-4 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {group.itens.map((venda: Venda) => {
                      const isLocked = venda.lock_user || venda.lock_admin
                      return (
                        <tr key={venda.id} className={cn("group transition-colors", isLocked ? "opacity-40" : "hover:bg-white/[0.02]")}>
                          <td className="px-4 py-3 text-[10px] font-bold">
                            {venda.data_venda ? format(new Date(venda.data_venda), "dd/MM/yy") : "---"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 items-center">
                              <span className="text-[8px] font-black uppercase bg-primary px-1.5 py-0.5 rounded italic">
                                {venda?.produto?.plataforma || "---"}
                              </span>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-white/5 italic">
                                {venda?.grupo?.nome || "Sem Grupo"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-black italic ">
                            #{venda.quantidade}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[11px] font-bold text-emerald-500">
                            $ {Number(venda.preco_total).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            {!isLocked ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white/10"><MoreHorizontal size={14} /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="">
                                  <DropdownMenuItem
                                    className="text-red-500 font-bold text-[10px] uppercase italic focus:bg-red-500/10 focus:text-red-500"
                                    onClick={() => handleDelete(venda)}
                                  >
                                    <Trash2 className="mr-2 h-3 w-3" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : <Lock size={10} className="mx-auto " />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )) : (
          <div className="py-20 border border-dashed border-white/10 rounded-[2rem] text-center bg-muted/5">
            <p className=" font-black uppercase italic text-[10px] tracking-widest">Nenhum lançamento registrado no período</p>
          </div>
        )}
      </div>
    </div>
  )
}