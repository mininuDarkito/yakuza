"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Search, Save, X, Edit3, Loader2, Trash2, CopyPlus,
    ChevronLeft, ChevronRight, Filter, Zap, Lock, Unlock, ShieldAlert, ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"

interface EditVendasProps {
    usuarios: any[]
    grupos: any[] 
}

export function EditVendasAdmin({ usuarios, grupos: gruposIniciais = [] }: EditVendasProps) {
    const [selectedUser, setSelectedUser] = useState("")
    const [userGroups, setUserGroups] = useState<any[]>([])
    const [isLoadingGroups, setIsLoadingGroups] = useState(false)

    const [view, setView] = useState<'catalog' | 'details'>('catalog')
    const [catalog, setCatalog] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [filterPlataforma, setFilterPlataforma] = useState("todos")
    const [history, setHistory] = useState<any[]>([])
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<any>(null)

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const [currentPage, setCurrentPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    // Filtragem de grupos por usuário selecionado
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

    const plataformasDisponiveis = Array.from(
        new Set(catalog.map((p) => p.plataforma).filter(Boolean))
    ).sort()

    const filteredCatalog = catalog.filter(item => {
        const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPlataforma = filterPlataforma === "todos" || item.plataforma === filterPlataforma
        return matchesSearch && matchesPlataforma
    })

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

    // APLICAR TRANCA (Level 1: User | Level 2: Master/Selado)
    const handleMassLock = async (level: 1 | 2) => {
        if (!selectedUser) return;
        const msg = level === 1 
            ? "Isso impedirá o usuário de editar as vendas deste mês. Continuar?" 
            : "LOCK MASTER: Isso selará o mês e nem você poderá editar sem reabrir. Continuar?";
        
        if (!confirm(msg)) return;

        try {
            const res = await fetch('/api/admin/vendas/mass-lock', {
                method: 'PATCH',
                body: JSON.stringify({
                    userId: selectedUser,
                    mes: currentMonth,
                    ano: currentYear,
                    level
                })
            });
            if (res.ok) {
                toast.success(level === 1 ? "Usuário Trancado!" : "Mês Selado com Sucesso!");
                fetchHistory(selectedProduct.produto_id, currentPage);
            }
        } catch (error) {
            toast.error("Falha ao processar tranca.");
        }
    }

    const startEdit = (venda: any) => {
        if (venda.lock_admin) {
            toast.error("Acesso Negado: Este registro está selado.");
            return;
        }
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
            if (!res.ok) throw new Error();
            toast.success("Registro auditado e salvo!");
            setEditingId(null);
            fetchHistory(selectedProduct.produto_id, currentPage);
        } catch (error) {
            toast.error("Erro ao salvar alteração.");
        }
    }

    const handleQuickCreate = async (venda: any) => {
        let nextCap = Number(venda.quantidade) + 1;
        
        try {
            const maxRes = await fetch(`/api/admin/vendas/next-chapter?produto_id=${venda.produto_id}`);
            if (maxRes.ok) {
                const maxData = await maxRes.json();
                const globalMax = Number(maxData.max_cap || 0);
                if (globalMax >= nextCap) {
                    nextCap = globalMax + 1;
                }
            }
        } catch (e) {
            console.error("Erro ao buscar próximo capítulo", e);
        }

        if (!confirm(`Deseja registrar o capítulo ${nextCap} com o mesmo preço rapidamente?`)) return;
        
        try {
            const res = await fetch('/api/admin/vendas/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedUser,
                    produto_id: venda.produto_id,
                    grupo_id: venda.grupo_id,
                    quantidade: nextCap,
                    preco_unitario: venda.preco_unitario,
                    data_venda: new Date(venda.data_venda).toISOString().split('T')[0] + 'T00:00:00.000Z'
                })
            });
            if (!res.ok) {
                 const data = await res.json();
                 throw new Error(data.error || "Erro ao criar registro");
            }
            toast.success(`Capítulo ${nextCap} registrado rapidamente!`);
            fetchHistory(selectedProduct.produto_id, currentPage);
        } catch (error: any) {
            toast.error(error.message || "Erro ao criar registro.");
        }
    }

    const removeItem = async (id: string) => {
        if (!confirm("Remover este registro permanentemente?")) return
        const res = await fetch(`/api/admin/vendas/delete?id=${id}`, { method: 'DELETE' })
        if (res.ok) {
            toast.success("Excluído");
            fetchHistory(selectedProduct.produto_id, currentPage);
        }
    }

    return (
        <div className="space-y-6">
            {/* PAINEL SUPERIOR */}
            <div className="bg-zinc-950 p-6 rounded-3xl border border-white/5 shadow-2xl space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase italic text-primary tracking-widest">Vendedor</label>
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
                            <option value="">Selecionar...</option>
                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.discord_username}</option>)}
                        </select>
                    </div>

                    {view === 'catalog' && catalog.length > 0 && (
                        <div className="flex flex-1 gap-4">
                            <div className="flex-1 space-y-2 animate-in fade-in">
                                <label className="text-[10px] font-black uppercase italic text-zinc-500 tracking-widest">Buscar Obra</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                    <Input
                                        placeholder="Localizar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-11 bg-zinc-900 border-white/10 rounded-xl font-bold italic"
                                    />
                                </div>
                            </div>

                            <div className="w-[180px] space-y-2 animate-in fade-in">
                                <label className="text-[10px] font-black uppercase italic text-zinc-500 tracking-widest">Plataforma</label>
                                <select
                                    value={filterPlataforma}
                                    onChange={(e) => setFilterPlataforma(e.target.value)}
                                    className="w-full h-11 bg-zinc-900 border border-white/10 rounded-xl px-3 text-xs font-bold text-white focus:border-primary outline-none uppercase italic"
                                >
                                    <option value="todos">Todas</option>
                                    {plataformasDisponiveis.map(plat => (
                                        <option key={plat as string} value={plat as string}>{plat as string}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {view === 'details' && selectedProduct && (
                        <div className="flex flex-wrap gap-2 items-end animate-in slide-in-from-right-4">
                            <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/5 h-11 items-center">
                                <Button onClick={() => handleMassLock(1)} variant="ghost" className="h-8 text-[9px] font-black uppercase italic hover:text-amber-500">
                                    <Lock className="h-3 w-3 mr-1" /> Trancar User
                                </Button>
                                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                                <Button onClick={() => handleMassLock(2)} variant="ghost" className="h-8 text-[9px] font-black uppercase italic hover:text-red-500">
                                    <ShieldAlert className="h-3 w-3 mr-1" /> Selar Master
                                </Button>
                            </div>

                            <select
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                className="h-11 bg-zinc-900 border border-white/10 rounded-xl px-3 text-xs font-bold text-white focus:border-primary outline-none"
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                        {new Date(0, i).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            
                            <Button onClick={() => fetchHistory(selectedProduct.produto_id, 1)} className="h-11 bg-primary text-black font-black text-[10px] uppercase italic px-6 rounded-xl">
                                <Filter className="h-3 w-3 mr-2" /> Filtrar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* ACERVO (CATÁLOGO) */}
            {view === 'catalog' && catalog.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in">
                    {filteredCatalog.map((item) => (
                        <div
                            key={item.produto_id}
                            onClick={() => { setSelectedProduct(item); fetchHistory(item.produto_id, 1); }}
                            className="group cursor-pointer bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden hover:border-primary transition-all relative"
                        >
                            <div className="aspect-[3/4] overflow-hidden">
                                <img src={item.imagem_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.nome} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                <div className="absolute bottom-3 left-3 flex flex-col">
                                    <span className="text-primary font-black text-[10px] uppercase italic">{item.total_caps_vendidos} caps</span>
                                    <span className="text-emerald-500 font-mono text-[9px] font-bold">$ {Number(item.faturamento_serie || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-black/40 text-center border-t border-white/5">
                                <h3 className="font-black text-[10px] uppercase italic truncate text-zinc-300 group-hover:text-primary transition-colors">{item.nome}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TABELA DE DETALHES */}
            {view === 'details' && selectedProduct && (
                <div className="space-y-4 animate-in slide-in-from-left-4">
                    <div className="flex justify-between items-center px-2">
                        <Button variant="ghost" onClick={() => setView('catalog')} className="text-zinc-500 hover:text-primary text-[10px] font-black uppercase italic group">
                            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" /> Voltar ao Acervo
                        </Button>

                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-2 rounded-2xl">
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block leading-none">Subtotal Local</span>
                            <span className="text-xl font-black text-emerald-500 italic">$ {history.reduce((acc, curr) => acc + Number(curr.preco_total || 0), 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="bg-zinc-950 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-black/40 text-[9px] font-black uppercase italic text-zinc-600 border-b border-white/5">
                                <tr>
                                    <th className="p-4">Grupo / Status</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4 text-center">Capítulo</th>
                                    <th className="p-4">Data</th>
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {history.map((v) => (
                                    <tr key={v.id} className={cn(
                                        "transition-colors group",
                                        v.lock_admin ? "bg-zinc-900/40 opacity-40" : "hover:bg-white/5"
                                    )}>
                                        <td className="p-4">
                                            {editingId === v.id ? (
                                                <select
                                                    value={editForm.grupo_id || ""}
                                                    onChange={e => setEditForm({ ...editForm, grupo_id: e.target.value })}
                                                    className="bg-zinc-900 border border-white/10 text-[10px] uppercase font-black text-primary rounded px-2 py-1 outline-none"
                                                >
                                                    <option value="">Sem Grupo</option>
                                                    {userGroups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                                </select>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-primary uppercase italic">{v.grupo_nome || "NÃO VINCULADO"}</span>
                                                    {v.lock_admin ? (
                                                        <span className="text-[7px] font-bold text-red-500 uppercase flex items-center gap-1"><ShieldCheck className="w-2 h-2" /> MASTER LOCK</span>
                                                    ) : v.lock_user && (
                                                        <span className="text-[7px] font-bold text-amber-500 uppercase flex items-center gap-1"><Lock className="w-2 h-2" /> USER LOCKED</span>
                                                    )}
                                                </div>
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
                                                <Input type="number" className="h-7 w-20 bg-zinc-900 text-xs border-white/10 text-center" value={editForm.quantidade} onChange={e => setEditForm({ ...editForm, quantidade: Number(e.target.value) })} />
                                            ) : (
                                                <span className="font-black text-zinc-100 italic text-xl">#{v.quantidade}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-[10px] font-bold text-zinc-500 uppercase italic">
                                            {editingId === v.id ? (
                                                <Input type="date" className="h-7 w-32 bg-zinc-900 text-[10px] border-white/10" value={editForm.data_venda} onChange={e => setEditForm({ ...editForm, data_venda: e.target.value })} />
                                            ) : (
                                                new Date(v.data_venda).toLocaleDateString('pt-BR')
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {v.lock_admin ? (
                                                <div className="flex justify-end items-center text-zinc-600 italic font-black text-[9px]">
                                                    <ShieldCheck className="h-3 w-3 mr-1" /> SELADO
                                                </div>
                                            ) : editingId === v.id ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 text-red-500"><X className="h-4 w-4" /></Button>
                                                    <Button size="icon" onClick={handleSave} className="h-7 w-7 bg-emerald-600 text-white shadow-lg"><Save className="h-4 w-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" title="Cadastrar próximo capítulo" onClick={() => handleQuickCreate(v)} className="h-7 w-7 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"><CopyPlus className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => removeItem(v.id)} className="h-7 w-7 text-zinc-600 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => startEdit(v)} className="h-7 w-7 text-primary hover:bg-primary/10"><Edit3 className="h-4 w-4" /></Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* PAGINAÇÃO */}
                        <div className="p-4 flex justify-between items-center bg-black/40 border-t border-white/5">
                            <Button disabled={currentPage === 1 || loading} onClick={() => fetchHistory(selectedProduct.produto_id, currentPage - 1)} variant="ghost" className="text-[10px] font-black uppercase text-zinc-400">
                                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-zinc-600 uppercase italic">Página</span>
                                <span className="h-7 w-7 flex items-center justify-center bg-primary text-black text-[10px] font-black rounded-lg">{currentPage}</span>
                            </div>
                            <Button disabled={!hasMore || loading} onClick={() => fetchHistory(selectedProduct.produto_id, currentPage + 1)} variant="ghost" className="text-[10px] font-black uppercase text-zinc-400">
                                Próxima <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}