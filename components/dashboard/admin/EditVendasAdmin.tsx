"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Search, Save, X, Edit3, Loader2, Trash2,
    ChevronLeft, ChevronRight, Filter, Zap, Copy, CheckCircle2, Plus
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EditVendasProps {
    usuarios: any[]
    grupos: any[] // Fallback inicial
}

export function EditVendasAdmin({ usuarios, grupos: gruposIniciais = [] }: EditVendasProps) {
    const [selectedUser, setSelectedUser] = useState("")
    const [userGroups, setUserGroups] = useState<any[]>([]) // Grupos filtrados do usuário
    const [isLoadingGroups, setIsLoadingGroups] = useState(false)

    const [view, setView] = useState<'catalog' | 'details'>('catalog')
    const [catalog, setCatalog] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [history, setHistory] = useState<any[]>([])
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<any>(null)

    // Estados de Paginação e Filtro
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    // --- FILTRAGEM DINÂMICA DE GRUPOS POR USUÁRIO ---
    useEffect(() => {
        const fetchUserGroups = async () => {
            if (!selectedUser) {
                setUserGroups([]);
                return;
            }
            setIsLoadingGroups(true);
            try {
                const res = await fetch(`/api/admin/grupos/list?userId=${selectedUser}`);
                if (!res.ok) throw new Error();
                const data = await res.json();
                setUserGroups(data);
            } catch (error) {
                console.error("Erro ao carregar grupos do usuário");
                setUserGroups([]);
            } finally {
                setIsLoadingGroups(false);
            }
        };
        fetchUserGroups();
    }, [selectedUser]);

    const filteredCatalog = catalog.filter(item =>
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const fetchCatalog = async (userId: string) => {
        if (!userId) return
        setLoading(true)
        setView('catalog')
        setSearchTerm("")
        try {
            const res = await fetch(`/api/admin/vendas/catalog?user_id=${userId}`)
            const data = await res.json()
            setCatalog(Array.isArray(data) ? data : [])
        } catch (error) {
            toast.error("Erro ao carregar catálogo")
        } finally {
            setLoading(false)
        }
    }

    const fetchHistory = async (produtoId: string, page = 1) => {
        setLoading(true);
        setHistory([]);
        try {
            const res = await fetch(
                `/api/admin/vendas/list?user_id=${selectedUser}&produto_id=${produtoId}&mes=${currentMonth}&ano=${currentYear}&page=${page}&cache_bust=${Date.now()}`
            );
            const data = await res.json();
            setHistory(Array.isArray(data) ? data : []);
            setCurrentPage(page);
            setHasMore(data?.length === 20);
            setView('details');
        } catch (error) {
            toast.error("Erro ao carregar histórico");
        } finally {
            setLoading(false);
        }
    }

    const startEdit = (venda: any) => {
        setEditingId(venda.id);
        const dataIso = new Date(venda.data_venda).toISOString().split('T')[0];
        setEditForm({
            ...venda,
            data_venda: dataIso,
            quantidade: venda.quantidade
        });
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/admin/vendas/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editForm.id,
                    preco_unitario: editForm.preco_unitario,
                    quantidade: Number(editForm.quantidade),
                    data_venda: `${editForm.data_venda}T00:00:00.000Z`,
                    grupo_id: editForm.grupo_id
                })
            })
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Erro ao salvar")
            }
            toast.success("Registro atualizado!")
            setEditingId(null)
            fetchHistory(selectedProduct.produto_id, currentPage)
        } catch (error: any) {
            toast.error(error.message || "Erro ao salvar alteração")
        }
    }

    const removeItem = async (id: string) => {
        if (!confirm("Excluir este lançamento permanentemente?")) return
        const res = await fetch(`/api/admin/vendas/delete?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
            toast.success("Removido")
            fetchHistory(selectedProduct.produto_id, currentPage)
        }
    }

    return (
        <div className="space-y-6">
            {/* CABEÇALHO DE CONTROLE */}
            <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5 shadow-2xl space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase italic text-primary tracking-widest">Auditar Vendedor</label>
                        <select
                            value={selectedUser}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedUser(val);
                                if (val) fetchCatalog(val);
                                else setCatalog([]);
                                setView('catalog');
                            }}
                            className="w-full h-11 bg-zinc-900 border border-white/10 rounded-xl px-4 text-sm text-white outline-none focus:border-primary transition-all font-bold italic"
                        >
                            <option value="">Selecione o vendedor...</option>
                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.discord_username}</option>)}
                        </select>
                    </div>

                    {view === 'catalog' && catalog.length > 0 && (
                        <div className="flex-1 space-y-2 animate-in fade-in">
                            <label className="text-[10px] font-black uppercase italic text-zinc-500 tracking-widest">Localizar Série</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Nome da obra..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-11 bg-zinc-900 border-white/10 rounded-xl font-bold italic"
                                />
                            </div>
                        </div>
                    )}

                    {view === 'details' && selectedProduct && (
                        <div className="flex gap-2 items-end animate-in slide-in-from-right-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black uppercase text-zinc-500 italic ml-1">Mês</label>
                                <select
                                    value={currentMonth}
                                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                    className="h-11 bg-zinc-900 border border-white/10 rounded-xl px-3 text-xs font-bold text-white outline-none focus:border-primary transition-all"
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>
                                            {new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                onClick={() => fetchHistory(selectedProduct.produto_id, 1)}
                                className="h-11 bg-primary/10 hover:bg-primary text-primary hover:text-black font-black text-[10px] uppercase italic transition-all px-6 rounded-xl border border-primary/20"
                            >
                                <Filter className="h-3 w-3 mr-2" /> Filtrar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* VISÃO: CATÁLOGO */}
            {view === 'catalog' && catalog.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in duration-500">
                    {filteredCatalog.map((item) => (
                        <div
                            key={item.produto_id}
                            onClick={() => { setSelectedProduct(item); fetchHistory(item.produto_id, 1); }}
                            className="group cursor-pointer bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden hover:border-primary transition-all shadow-xl"
                        >
                            <div className="aspect-[3/4] overflow-hidden relative">
                                <img src={item.imagem_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.nome} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                                <div className="absolute bottom-3 left-3 flex flex-col gap-0.5">
                                    <span className="text-primary font-black text-[10px] uppercase italic">
                                        {item.total_caps_vendidos} caps total
                                    </span>
                                    <span className="text-emerald-500 font-mono text-[9px] font-bold">
                                        $ {Number(item.faturamento_serie || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-black/20">
                                <h3 className="font-black text-xs uppercase italic truncate text-zinc-200 group-hover:text-primary transition-colors">
                                    {item.nome}
                                </h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">
                                    {item.total_registros} entradas
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* VISÃO: DETALHES/TABELA */}
            {view === 'details' && selectedProduct && (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-500">
                    <div className="flex justify-between items-end">
                        <Button variant="ghost" onClick={() => setView('catalog')} className="text-zinc-500 hover:text-primary text-[10px] font-black uppercase group">
                            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Voltar ao Acervo
                        </Button>

                        {/* TOTALIZADOR DO MÊS FILTRADO */}
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl flex flex-col items-end">
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Subtotal do Período</span>
                            <span className="text-xl font-black text-emerald-500 italic tracking-tighter">
                                $ {history.reduce((acc, curr) => acc + Number(curr.preco_total || 0), 0).toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-zinc-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <div className="p-6 bg-white/5 flex items-center gap-4 border-b border-white/5">
                            <img src={selectedProduct.imagem_url} className="h-14 w-11 object-cover rounded shadow-2xl" alt="" />
                            <div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-100 leading-none mb-1">{selectedProduct.nome}</h2>
                                <p className="text-[9px] font-black text-primary uppercase tracking-widest italic">
                                    Auditoria: {new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' })} / {currentYear}
                                </p>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40 text-[9px] font-black uppercase italic text-zinc-600 border-b border-white/5">
                                <tr>
                                    <th className="p-4">Grupo / Hierarquia</th>
                                    <th className="p-4">Preço Unit.</th>
                                    <th className="p-4 text-center">Capítulo</th>
                                    <th className="p-4">Data Operação</th>
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.length > 0 ? (
                                    history.map((v) => (
                                        <tr key={v.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-4">
                                                {editingId === v.id ? (
                                                    <select
                                                        value={editForm.grupo_id || ""}
                                                        disabled={isLoadingGroups} // Trava enquanto carrega
                                                        onChange={e => setEditForm({ ...editForm, grupo_id: e.target.value })}
                                                        className="bg-zinc-900 border border-white/10 text-[10px] uppercase font-black text-primary rounded px-2 py-1 outline-none focus:border-primary/50"
                                                    >
                                                        <option value="">
                                                            {isLoadingGroups ? "Carregando..." : "Sem Grupo"}
                                                        </option>

                                                        {/* USANDO A LISTA FILTRADA userGroups EM VEZ DE grupos */}
                                                        {userGroups.map(g => (
                                                            <option key={g.id} value={g.id}>
                                                                {g.nome}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-[10px] font-black text-primary uppercase italic">
                                                        {v.grupo_nome || "---"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono text-emerald-500 font-bold italic text-sm">
                                                {editingId === v.id ? (
                                                    <Input type="number" step="0.01" className="h-7 w-20 bg-zinc-900 text-xs border-white/10" value={editForm.preco_unitario} onChange={e => setEditForm({ ...editForm, preco_unitario: e.target.value })} />
                                                ) : (
                                                    `$${Number(v.preco_unitario).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {editingId === v.id ? (
                                                    <Input
                                                        type="number"
                                                        className="h-7 w-20 bg-zinc-900 text-xs font-mono text-center mx-auto border-primary/30"
                                                        value={editForm.quantidade}
                                                        onChange={e => setEditForm({ ...editForm, quantidade: Number(e.target.value) })}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-black text-zinc-100 italic tracking-tighter text-2xl">#{v.quantidade}</span>
                                                        <span className="text-[8px] font-bold text-zinc-600 uppercase italic">Registro</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-[10px] font-bold text-zinc-500 uppercase italic">
                                                {editingId === v.id ? (
                                                    <Input type="date" className="h-7 w-32 bg-zinc-900 text-[10px] font-bold uppercase border-white/10" value={editForm.data_venda} onChange={e => setEditForm({ ...editForm, data_venda: e.target.value })} />
                                                ) : (
                                                    new Date(v.data_venda).toLocaleDateString('pt-BR')
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {editingId === v.id ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 text-red-500"><X className="h-4 w-4" /></Button>
                                                        <Button size="icon" onClick={handleSave} className="h-7 w-7 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><Save className="h-4 w-4" /></Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" onClick={() => removeItem(v.id)} className="h-7 w-7 text-zinc-600 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                                        <Button size="icon" variant="ghost" onClick={() => startEdit(v)} className="h-7 w-7 text-primary hover:bg-primary/10"><Edit3 className="h-4 w-4" /></Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Filter className="h-8 w-8 text-zinc-800" />
                                                <span className="text-[10px] font-black uppercase italic text-zinc-600 tracking-widest">
                                                    Nenhum lançamento encontrado para este período
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* RODAPÉ DE PAGINAÇÃO */}
                        <div className="p-4 flex justify-between items-center bg-black/40 border-t border-white/5">
                            <Button
                                disabled={currentPage === 1 || loading}
                                onClick={() => fetchHistory(selectedProduct.produto_id, currentPage - 1)}
                                variant="ghost"
                                className="text-[10px] font-black uppercase text-zinc-400 hover:text-primary disabled:opacity-20 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                            </Button>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-zinc-600 uppercase italic">Página</span>
                                <span className="h-7 w-7 flex items-center justify-center bg-primary text-black text-[10px] font-black rounded-lg shadow-lg shadow-primary/20">{currentPage}</span>
                            </div>

                            <Button
                                disabled={!hasMore || loading}
                                onClick={() => fetchHistory(selectedProduct.produto_id, currentPage + 1)}
                                variant="ghost"
                                className="text-[10px] font-black uppercase text-zinc-400 hover:text-primary disabled:opacity-20 transition-all"
                            >
                                Próxima <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {loading && (
                <div className="flex justify-center py-10 animate-pulse">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
            )}
        </div>
    )
}