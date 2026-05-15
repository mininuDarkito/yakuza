"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress" // Se você tiver o componente de progresso do shadcn
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
        const inicio = parseFloat(partes[0].replace(/[^\d.]/g, ''));
        const fim = parseFloat(partes[1].replace(/[^\d.]/g, ''));
        if (!isNaN(inicio) && !isNaN(fim)) return Math.floor(Math.abs(fim - inicio)) + 1;
    }
    if (limpo.includes(',')) return limpo.split(',').filter(cap => cap.length > 0).length;
    const numerico = limpo.replace(/[^\d.]/g, '');
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
    channel_id: string
}

export function MasterControl({ usuarios, gruposInitial = [] }: { usuarios: Usuario[], gruposInitial?: Grupo[] }) {
    const [targetUser, setTargetUser] = useState("")
    const [rawLinks, setRawLinks] = useState("")
    const [rawNames, setRawNames] = useState("")
    const [isIdentifying, setIsIdentifying] = useState(false)
    const [buffer, setBuffer] = useState<PreVenda[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>(gruposInitial)
    const [isLoadingGrupos, setIsLoadingGrupos] = useState(false)
    const [progress, setProgress] = useState(0)
    const [statusText, setStatusText] = useState("")

    // 1. Efeito para buscar TODOS os grupos globais (Ferramenta Admin)
    useEffect(() => {
        const fetchTodosGrupos = async () => {
            setIsLoadingGrupos(true);
            try {
                // Chamada sem userId para disparar a listagem global da API
                const res = await fetch(`/api/admin/grupos/list`);

                if (!res.ok) throw new Error("Falha ao carregar mapa de grupos");

                const data = await res.json();

                if (Array.isArray(data)) {
                    setGrupos(data);
                } else {
                    setGrupos([]);
                }
            } catch (error) {
                console.error("❌ [YAKUZA ADMIN] Erro ao carregar grupos:", error);
                toast.error("Erro ao carregar a lista global de grupos.");
                setGrupos([]);
            } finally {
                setIsLoadingGrupos(false);
            }
        };

        fetchTodosGrupos();
    }, []); // Executa apenas uma vez ao montar a ferramenta admin

    // 2. Função para duplicar linha (Mesma série, configurações diferentes)
    const duplicateItem = (item: PreVenda) => {
        const newItem: PreVenda = {
            ...item,
            tempId: Math.random().toString(36).substring(7),
            status: 'idle',
        };

        setBuffer(prev => {
            const index = prev.findIndex(i => i.tempId === item.tempId);
            const newBuffer = [...prev];
            newBuffer.splice(index + 1, 0, newItem);
            return newBuffer;
        });
        toast.info(`Linha duplicada para ${item.nome}`);
    };

    // 3. Função de Identificação com Barra de Progresso (Sequencial)
    const handleIdentify = async () => {
        if (!targetUser) return toast.error("Selecione o usuário de destino!");

        setIsIdentifying(true);
        setProgress(0);

        const links = rawLinks.split(/[\n,]+/).map(l => l.trim()).filter(l => l.startsWith('http'));
        const nomes = rawNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
        
        const total = links.length + nomes.length;
        if (total === 0) return toast.error("Insira ao menos um link ou nome!");

        const novosItensEncontrados: PreVenda[] = [];

        try {
            // Chamada única para a API com todos os dados
            setStatusText(`Identificando ${total} itens no banco de dados...`);
            setProgress(30);

            const res = await fetch('/api/admin/master-control/identify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links, nomes, user_id: targetUser })
            });

            if (!res.ok) throw new Error("Erro na API de identificação");

            const data = await res.json();
            if (data && data.length > 0) {
                data.forEach((item: any) => {
                    novosItensEncontrados.push({
                        ...item,
                        tempId: Math.random().toString(36).substring(7),
                        status: 'idle',
                        capitulosString: "",
                        quantidade: 0,
                        data: new Date().toISOString().split('T')[0]
                    });
                });
            }

            setProgress(100);

            setBuffer(prev => [...prev, ...novosItensEncontrados]);
            setRawLinks("");
            setRawNames("");
            toast.success(`${novosItensEncontrados.length} obras identificadas!`);

        } catch (error) {
            console.error(error);
            toast.error("Erro crítico durante o processamento dos links.");
        } finally {
            setIsIdentifying(false);
            setProgress(0);
            setStatusText("");
        }
    };

    // 4. Registro Individual
    const registerSingle = async (item: PreVenda) => {
        if (item.status === 'success' || item.status === 'loading') return;
        if (!item.capitulosString) return toast.error(`Defina os caps para ${item.nome}`);
        if (!item.grupo_id) return toast.error(`Selecione o grupo para ${item.nome}`);

        setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'loading' } : i));

        try {
            const res = await fetch('/api/admin/master-control/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, user_id: targetUser })
            });

            const responseData = await res.json();
            if (!res.ok) throw new Error(responseData.error || "Erro ao registrar");

            setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'success' } : i));
        } catch (err: any) {
            toast.error(err.message);
            setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, status: 'error' } : i));
        }
    };

    // 5. Registro em Lote (Sequencial)
    const registerAll = async () => {
        const pendentes = buffer.filter(i => i.status === 'idle' || i.status === 'error');
        if (pendentes.length === 0) return toast.info("Nenhuma pendência no buffer.");
        if (pendentes.some(i => !i.grupo_id)) return toast.error("Existem obras sem grupo selecionado!");

        for (const item of pendentes) {
            await registerSingle(item);
        }
    };

    const removeItem = (id: string) => {
        setBuffer(prev => prev.filter(i => i.tempId !== id));
    };


    return (
        <div className="space-y-6">
            {/* CARD DE ENTRADA E IDENTIFICAÇÃO */}
            <Card className="bg-zinc-950 border-primary/20 shadow-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase italic text-primary tracking-widest">Registrar Vendas Para:</label>
                            <Select value={targetUser} onValueChange={setTargetUser} disabled={isIdentifying}>
                                <SelectTrigger className="bg-zinc-900 border-white/5 h-12 focus:ring-primary/20">
                                    <SelectValue placeholder="Escolha o vendedor..." />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                    {usuarios.map(u => (
                                        <SelectItem key={u.id} value={u.id} className="font-bold focus:bg-primary focus:text-black">
                                            {u.discord_username}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase italic text-primary tracking-widest flex justify-between">
                                Links das Obras
                                <span className="text-zinc-500 lowercase font-medium italic text-[8px]">Scraper Automático</span>
                            </label>
                            <textarea
                                className="w-full h-12 bg-zinc-900 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-zinc-400 focus:border-primary/50 outline-none transition-all focus:h-32"
                                value={rawLinks}
                                onChange={(e) => setRawLinks(e.target.value)}
                                disabled={isIdentifying}
                                placeholder="Cole os links aqui..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase italic text-primary tracking-widest flex justify-between">
                                Pesquisa por Nome
                                <span className="text-zinc-500 lowercase font-medium italic text-[8px]">Busca no Banco de Dados</span>
                            </label>
                            <textarea
                                className="w-full h-12 bg-zinc-900 border border-white/5 rounded-xl p-3 text-[10px] font-mono text-zinc-400 focus:border-primary/50 outline-none transition-all focus:h-32"
                                value={rawNames}
                                onChange={(e) => setRawNames(e.target.value)}
                                disabled={isIdentifying}
                                placeholder="Digite os nomes das obras (um por linha)..."
                            />
                        </div>
                    </div>

                    {/* BARRA DE PROGRESSO NEON */}
                    {isIdentifying && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-300 py-2">
                            <div className="flex justify-between items-end">
                                <span className="text-[9px] font-black uppercase italic text-primary animate-pulse">
                                    {statusText}
                                </span>
                                <span className="text-[10px] font-mono text-primary font-bold">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_12px_#ccff00]"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleIdentify}
                        disabled={isIdentifying || !targetUser || (!rawLinks.trim() && !rawNames.trim())}
                        className="w-full h-12 font-black uppercase italic tracking-wider shadow-lg active:scale-[0.98] transition-all bg-primary hover:bg-primary/80 text-black"
                    >
                        {isIdentifying ? (
                            <Loader2 className="animate-spin mr-2 h-5 w-5" />
                        ) : (
                            <Search className="mr-2 h-5 w-5" />
                        )}
                        {isIdentifying ? "Processando Lote..." : "Identificar e Gerar Buffer"}
                    </Button>
                </CardContent>
            </Card>

            {/* TABELA DE BUFFER COM CABEÇALHO FIXO */}
            {buffer.length > 0 && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center px-2">
                        <div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-zinc-100">
                                <Zap className="h-5 w-5 text-primary" /> Buffer de Injeção
                            </h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase italic">
                                {buffer.filter(i => i.status === 'success').length} de {buffer.length} processados
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setBuffer([])} className="text-[10px] font-black border-red-500/20 text-red-500 hover:bg-red-500/10">
                                <Trash2 className="h-3 w-3 mr-1" /> Limpar
                            </Button>
                            <Button size="sm" onClick={registerAll} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase italic">
                                <Play className="h-3 w-3 mr-2" /> Confirmar Todos
                            </Button>
                        </div>
                    </div>

                    <div className="bg-zinc-950 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden max-h-[650px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-md text-[9px] font-black uppercase italic text-zinc-500 border-b border-white/5">
                                <tr>
                                    <th className="p-4">Série / Origem</th>
                                    <th className="p-4">Grupo / Scan</th>
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

                                        {/* COLUNA GRUPO (MAPA GLOBAL YAKUZA) */}
                                        <td className="p-4">
                                            <select
                                                value={item.grupo_id}
                                                // No Admin, o select só trava se a venda já foi salva com sucesso
                                                disabled={item.status === 'success' || isLoadingGrupos}
                                                onChange={e => setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, grupo_id: e.target.value } : i))}
                                                className="h-9 w-full max-w-[180px] bg-zinc-950 border border-white/10 rounded-xl px-3 text-[10px] font-black uppercase italic text-primary outline-none focus:border-primary/50 disabled:opacity-30 transition-all cursor-pointer"
                                            >
                                                <option value="">{isLoadingGrupos ? "Sincronizando..." : "SELECIONAR CANAL..."}</option>
                                                {grupos.map(g => (
                                                    <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                                                        {g.nome} {g.channel_id ? `(${g.channel_id.slice(-4)})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* PREÇO */}
                                        <td className="p-4">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={item.valor}
                                                disabled={item.status === 'success'}
                                                onChange={e => setBuffer(prev => prev.map(i => i.tempId === item.tempId ? { ...i, valor: Number(e.target.value) } : i))}
                                                className="h-8 w-20 bg-zinc-900 border-white/5 text-xs font-mono font-bold text-emerald-400"
                                            />
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
                                                <p className="text-[8px] font-black text-emerald-400 uppercase italic leading-none">
                                                    = {item.quantidade} registros
                                                </p>
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
                                            <div className="flex justify-end gap-2 items-center">
                                                {item.status === 'success' ? (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => duplicateItem(item)}
                                                            className="h-8 w-8 text-zinc-400 hover:text-primary transition-colors"
                                                            title="Duplicar série"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 animate-in zoom-in" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => duplicateItem(item)}
                                                            className="h-8 w-8 text-zinc-400 hover:text-blue-400 transition-colors"
                                                            title="Adicionar outra entrada"
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
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}