"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Loader2,
    CheckCircle2,
    Play,
    Trash2,
    Zap,
    Search,
    Layers,
    Copy,
    Plus
} from "lucide-react"
import { cn } from "@/lib/utils"

// --- PARSER PARA INTERFACE ---
function parseCapitulosCount(input: string): number {
    const limpo = input.replace(/\s+/g, '');
    if (limpo.includes('-')) {
        const partes = limpo.split('-');
        const inicio = parseInt(partes[0].replace(/\D/g, ''));
        const fim = parseInt(partes[1].replace(/\D/g, ''));
        if (!isNaN(inicio) && !isNaN(fim)) return Math.abs(fim - inicio) + 1;
    }
    if (limpo.includes(',')) return limpo.split(',').filter(cap => cap.length > 0).length;
    const numerico = limpo.replace(/\D/g, '');
    return numerico ? 1 : 0;
}

interface PreVenda {
    tempId: string
    produto_id: string
    nome: string
    imagem_url: string
    plataforma: string
    valor: number
    capitulosString: string
    quantidade: number
    data: string
    grupo_id: string // <-- ADICIONADO
    status: 'idle' | 'loading' | 'success' | 'error'
}

interface Usuario {
    id: string
    discord_username: string
}

interface Grupo {
    id: string
    nome: string
}

export function MasterControl({ usuarios, gruposInitial = [] }: { usuarios: Usuario[], gruposInitial?: Grupo[] }) {
    const [targetUser, setTargetUser] = useState("")
    const [rawLinks, setRawLinks] = useState("")
    const [isIdentifying, setIsIdentifying] = useState(false)
    const [buffer, setBuffer] = useState<PreVenda[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>(gruposInitial)
    const [isLoadingGrupos, setIsLoadingGrupos] = useState(false)

    // Busca grupos se não vierem via props
    useEffect(() => {
        const fetchGruposDoUsuario = async () => {
            // Se não tem usuário selecionado, limpamos a lista e paramos aqui
            if (!targetUser) {
                setGrupos([]);
                return;
            }

            setIsLoadingGrupos(true);

            try {
                // Chamamos APENAS a rota filtrada
                const res = await fetch(`/api/admin/grupos/list?userId=${targetUser}`);

                if (!res.ok) throw new Error("Erro na resposta");

                const data = await res.json();

                // Atualizamos os grupos com o que veio do banco (filtrado)
                setGrupos(data);

                // Resetamos os grupos selecionados no buffer para evitar conflitos
                setBuffer(prev => prev.map(item => ({ ...item, grupo_id: "" })));

            } catch (error) {
                console.error("Erro ao carregar grupos:", error);
                toast.error("Erro ao carregar grupos do usuário.");
                setGrupos([]);
            } finally {
                setIsLoadingGrupos(false);
            }
        };

        fetchGruposDoUsuario();
    }, [targetUser]); // Removido o gruposInitial daqui para evitar loops infinitos



    const duplicateItem = (item: PreVenda) => {
        const newItem: PreVenda = {
            ...item,
            tempId: Math.random().toString(36).substring(7), // Novo ID temporário
            status: 'idle', // Reseta o status para poder injetar de novo
            // Mantemos nome, imagem, valor e plataforma, mas deixamos os caps e grupo
            // para o usuário decidir se quer mudar ou manter
        };

        setBuffer(prev => {
            // Encontra a posição do item atual para inserir a cópia logo abaixo dele
            const index = prev.findIndex(i => i.tempId === item.tempId);
            const newBuffer = [...prev];
            newBuffer.splice(index + 1, 0, newItem);
            return newBuffer;
        });

        toast.info(`Linha duplicada para ${item.nome}`);
    };

    const handleIdentify = async () => {
        if (!targetUser) return toast.error("Selecione o usuário de destino!")
        if (!rawLinks.trim()) return toast.error("Insira ao menos um link!")

        setIsIdentifying(true)
        const links = rawLinks.split(/[\s\n,]+/).filter(l => l.startsWith('http'))

        try {
            const res = await fetch('/api/admin/master-control/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links, user_id: targetUser })
            })

            if (!res.ok) throw new Error("Falha na identificação")
            const data = await res.json()

            const novosItens = data.map((item: any) => ({
                ...item,
                tempId: Math.random().toString(36).substring(7),
                status: 'idle',
                capitulosString: "",
                quantidade: 0,
                grupo_id: "", // Inicia vazio para forçar seleção
                data: new Date().toISOString().split('T')[0]
            }))

            setBuffer(prev => [...prev, ...novosItens])
            setRawLinks("")
            toast.success(`${novosItens.length} obras identificadas!`)
        } catch (error) {
            toast.error("Erro no servidor de identificação.")
        } finally {
            setIsIdentifying(false)
        }
    }

    const registerSingle = async (item: PreVenda) => {
        if (item.status === 'success' || item.status === 'loading') return
        if (!item.capitulosString) return toast.error(`Defina os caps para ${item.nome}`)
        if (!item.grupo_id) return toast.error(`Selecione o grupo para ${item.nome}`)

        setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'loading' } : i))

        try {
            const res = await fetch('/api/admin/master-control/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...item,
                    user_id: targetUser
                })
            })

            const responseData = await res.json()
            if (!res.ok) throw new Error(responseData.error || "Erro ao registrar")

            setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'success' } : i))
        } catch (err: any) {
            toast.error(err.message)
            setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'error' } : i))
        }
    }

    const registerAll = async () => {
        const pendentes = buffer.filter(i => i.status === 'idle' || i.status === 'error')
        if (pendentes.length === 0) return toast.info("Nenhuma pendência no buffer.")
        if (pendentes.some(i => !i.grupo_id)) return toast.error("Existem obras sem grupo selecionado!")

        for (const item of pendentes) {
            await registerSingle(item)
        }
    }

    const removeItem = (id: string) => {
        setBuffer(prev => prev.filter(i => i.tempId !== id))
    }





    return (
        <div className="space-y-6">
            {/* INPUT DE LINKS (Mantido) */}
            <Card className="bg-zinc-950 border-primary/20 shadow-2xl">
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase italic text-primary tracking-widest">Registrar Vendas Para:</label>
                        <Select value={targetUser} onValueChange={setTargetUser}>
                            <SelectTrigger className="bg-zinc-900 border-white/5 h-12">
                                <SelectValue placeholder="Escolha o vendedor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {usuarios.map(u => (
                                    <SelectItem key={u.id} value={u.id} className="font-bold">{u.discord_username}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase italic text-primary tracking-widest">Links das Obras</label>
                        <textarea
                            className="w-full h-32 bg-zinc-900 border border-white/5 rounded-2xl p-4 text-sm font-mono text-zinc-400 focus:border-primary/50 outline-none transition-all"
                            value={rawLinks}
                            onChange={(e) => setRawLinks(e.target.value)}
                            placeholder="Cole os links das obras aqui..."
                        />
                    </div>

                    <Button onClick={handleIdentify} disabled={isIdentifying} className="w-full h-12 font-black uppercase italic tracking-wider">
                        {isIdentifying ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2 h-5 w-5" />}
                        Identificar e Gerar Buffer
                    </Button>
                </CardContent>
            </Card>

            {/* TABELA DE CONFIRMAÇÃO (BUFFER ATUALIZADO) */}
            {buffer.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-end px-2">
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-zinc-100">
                                <Zap className="h-5 w-5 text-primary" /> Buffer de Injeção Automática
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setBuffer([])} className="text-[10px] font-black uppercase border-red-500/20 text-red-500 hover:bg-red-500/10">
                                <Trash2 className="h-3 w-3 mr-1" /> Limpar
                            </Button>
                            <Button size="sm" onClick={registerAll} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase italic shadow-lg shadow-emerald-500/20">
                                <Play className="h-3 w-3 mr-2" /> Confirmar Todos
                            </Button>
                        </div>
                    </div>

                    <div className="bg-zinc-950 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 text-[9px] font-black uppercase italic text-zinc-500 border-b border-white/5">
                                <tr>
                                    <th className="p-4">Série / Origem</th>
                                    <th className="p-4">Grupo / Scan</th> {/* NOVA COLUNA */}
                                    <th className="p-4">Preço ($)</th>
                                    <th className="p-4">Intervalo (Parser)</th>
                                    <th className="p-4">Data Operação</th>
                                    <th className="p-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {buffer.map((item) => (
                                    <tr key={item.tempId} className={cn(
                                        "transition-colors",
                                        item.status === 'success' ? "bg-emerald-500/5 opacity-60" : "hover:bg-white/5"
                                    )}>
                                        {/* SÉRIE */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <img src={item.imagem_url} className="h-12 w-9 object-cover rounded-lg border border-white/10 shadow-lg" />
                                                <div>
                                                    <p className="font-black text-sm uppercase italic leading-none mb-1 text-zinc-200">{item.nome}</p>
                                                    <p className="text-[9px] font-black text-primary uppercase italic opacity-70">{item.plataforma}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* SELEÇÃO DE GRUPO (NOVO) */}
                                        <td className="p-4">
                                            <select
                                                value={item.grupo_id}
                                                disabled={item.status === 'success' || isLoadingGrupos}
                                                onChange={e => setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, grupo_id: e.target.value } : i))}
                                                className="h-8 w-full max-w-[150px] bg-zinc-900 border border-white/10 rounded-lg px-2 text-[10px] font-black uppercase italic text-primary outline-none focus:border-primary/50 disabled:opacity-50"
                                            >
                                                <option value="">
                                                    {isLoadingGrupos ? "Carregando..." : "Selecionar Grupo..."}
                                                </option>
                                                {grupos.map(g => (
                                                    <option key={g.id} value={g.id}>{g.nome}</option>
                                                ))}
                                            </select>
                                            {grupos.length === 0 && targetUser && !isLoadingGrupos && (
                                                <p className="text-[8px] text-red-500 mt-1 uppercase font-bold">Usuário sem grupos!</p>
                                            )}
                                        </td>

                                        {/* INTERVALO */}
                                        <td className="p-4">
                                            <div className="space-y-1">
                                                <Input
                                                    type="text"
                                                    placeholder="Ex: 1-10"
                                                    value={item.capitulosString}
                                                    disabled={item.status === 'success'}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const total = parseCapitulosCount(val);
                                                        setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, capitulosString: val, quantidade: total } : i));
                                                    }}
                                                    className="h-8 w-28 bg-zinc-900 border-white/5 text-xs font-mono font-bold text-zinc-300"
                                                />
                                                <p className="text-[8px] font-black text-emerald-400 uppercase italic">= {item.quantidade} registros</p>
                                            </div>
                                        </td>

                                        {/* DATA */}
                                        <td className="p-4">
                                            <Input
                                                type="date"
                                                value={item.data}
                                                disabled={item.status === 'success'}
                                                onChange={e => setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, data: e.target.value } : i))}
                                                className="h-8 w-32 bg-zinc-900 border-white/5 text-[10px] font-bold uppercase text-zinc-400"
                                            />
                                        </td>

                                        {/* AÇÃO */}
                                        <td className="p-4 text-right">
                                            {item.status === 'success' ? (
                                                <div className="flex justify-end gap-2 items-center">
                                                    {/* Mesmo se deu sucesso, permitimos duplicar para registrar em outro lugar */}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => duplicateItem(item)}
                                                        className="h-8 w-8 text-zinc-400 hover:text-primary"
                                                        title="Duplicar para outro registro"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-in zoom-in" />
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2">
                                                    {/* BOTÃO DE DUPLICAR / MAIS */}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => duplicateItem(item)}
                                                        className="h-8 w-8 text-zinc-400 hover:text-blue-400 transition-colors"
                                                        title="Adicionar outra entrada desta série"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removeItem(item.tempId)}
                                                        className="h-8 w-8 text-zinc-600 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        disabled={item.status === 'loading'}
                                                        onClick={() => registerSingle(item)}
                                                        className="h-8 font-black italic uppercase text-[10px] px-4 shadow-lg active:scale-95 transition-all"
                                                    >
                                                        {item.status === 'loading' ? <Loader2 className="animate-spin h-3 w-3" /> : "Injetar"}
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}