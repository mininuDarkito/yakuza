"use client"

import React, { useState, useMemo, useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts'
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, BarChart3, PieChart as PieIcon, X, ChevronRight, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const COLORS = [
    '#ccff00', // Lime Yakuza (Destaque principal)
    '#00ff9f', // Spring Green
    '#00b8ff', // Sky Blue
    '#bd00ff', // Purple Neon
    '#ff0055', // Pink Punch
    '#ff9900', // Neon Orange
    '#00f5ff'  // Electric Cyan
];

interface PerformanceProps {
    userId: string;
    viewMode: 'admin' | 'user';
}

export function PerformanceCycle({ userId, viewMode }: PerformanceProps) {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
    const [activeMonth, setActiveMonth] = useState<number | null>(null)
    const [monthlyData, setMonthlyData] = useState<any[]>([])
    const [detailedSales, setDetailedSales] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const [eixoX, setEixoX] = useState("grupo_nome")
    const [metrica, setMetrica] = useState("preco_total")
    const [tipoGrafico, setTipoGrafico] = useState("barra")

    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

    useEffect(() => {
        const fetchYearlySummary = async () => {
            try {
                const res = await fetch(`/api/admin/user/${userId}?year=${selectedYear}`)
                const data = await res.json()
                setMonthlyData(data.performance || [])
            } catch (error) {
                console.error("Erro ao carregar ciclo")
            }
        }
        fetchYearlySummary()
    }, [userId, selectedYear])

    const handleMonthClick = async (monthIndex: number) => {
        if (viewMode !== 'admin') return;

        if (activeMonth === monthIndex) {
            setActiveMonth(null)
            return
        }

        setIsLoading(true)
        setActiveMonth(monthIndex)
        try {
            const res = await fetch(`/api/admin/vendas/list?user_id=${userId}&mes=${monthIndex}&ano=${selectedYear}`)
            const data = await res.json()
            setDetailedSales(data || [])
        } catch (error) {
            toast.error("Erro ao carregar detalhes")
        } finally {
            setIsLoading(false)
        }
    }

    const chartData = useMemo(() => {
        if (viewMode !== 'admin' || !detailedSales.length) return [];

        const mapa = detailedSales.reduce((acc: any, v: any) => {
            let chave = eixoX === "grupo_nome" ? v.grupo_nome || "Sem Grupo" : v.produto_nome || "Sem Produto"
            if (!acc[chave]) acc[chave] = { name: chave, value: 0 }

            // CORREÇÃO: preco_total soma o dinheiro, quantidade conta 1 registro por capítulo vendido
            const valor = metrica === "preco_total" ? Number(v.preco_total) : 1
            acc[chave].value += valor
            return acc
        }, {})

        return Object.values(mapa).sort((a: any, b: any) => b.value - a.value)
    }, [detailedSales, eixoX, metrica, viewMode])

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-primary">
                    <Calendar className="h-5 w-5" /> Ciclo de Performance
                </h2>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[100px] bg-zinc-900 border-white/5 font-black italic text-xs text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {meses.map((nome, i) => {
                    const mesIndex = i + 1
                    const stats = monthlyData.find(m => Number(m.mes_index) === mesIndex)
                    const isSelected = activeMonth === mesIndex

                    return (
                        <Card
                            key={nome}
                            onClick={() => handleMonthClick(mesIndex)}
                            className={cn(
                                "border-2 transition-all relative overflow-hidden group",
                                viewMode === 'admin' ? "cursor-pointer" : "cursor-default",
                                isSelected ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-white/5 bg-zinc-900/30",
                                viewMode === 'admin' && !isSelected && "hover:border-white/20"
                            )}
                        >
                            <CardContent className="p-4 text-center">
                                <p className={cn("text-[10px] font-black uppercase mb-1", isSelected ? "text-primary" : "text-zinc-500")}>
                                    {nome}
                                </p>
                                <p className="text-sm font-black text-white italic leading-none font-mono">
                                    R$ {stats ? Number(stats.total).toFixed(2) : "0.00"}
                                </p>

                                {viewMode === 'admin' && (
                                    <div className={cn(
                                        "absolute top-1 right-1 transition-all",
                                        isSelected ? "opacity-100 rotate-90" : "opacity-0 group-hover:opacity-100"
                                    )}>
                                        <ChevronRight className="h-2 w-2 text-primary" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {viewMode === 'admin' && activeMonth && (
                <div className="bg-zinc-950 rounded-[2rem] border border-primary/20 p-8 space-y-8 animate-in slide-in-from-top-4 duration-500 relative shadow-2xl">
                    <button onClick={() => setActiveMonth(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                        <div>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                                <TrendingUp className="text-primary h-6 w-6" />
                                Detalhes de {meses[activeMonth - 1]}
                            </h3>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase italic tracking-widest">Auditoria de Dados</p>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-zinc-600 ml-1 italic tracking-widest">Dimensão</label>
                                <Select value={eixoX} onValueChange={setEixoX}>
                                    <SelectTrigger className="w-[140px] h-9 bg-zinc-900 border-white/10 text-[10px] font-bold uppercase italic text-white focus:ring-primary"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                        <SelectItem value="grupo_nome">Por Grupo</SelectItem>
                                        <SelectItem value="produto_nome">Por Produto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-zinc-600 ml-1 italic tracking-widest">Métrica</label>
                                <Select value={metrica} onValueChange={setMetrica}>
                                    <SelectTrigger className="w-[140px] h-9 bg-zinc-900 border-white/10 text-[10px] font-bold uppercase italic text-white focus:ring-primary"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                        <SelectItem value="preco_total">Faturamento (R$)</SelectItem>
                                        <SelectItem value="quantidade">Capítulos (UN)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex bg-zinc-900 p-1 rounded-xl self-end h-9 border border-white/5">
                                <button onClick={() => setTipoGrafico("barra")} className={cn("px-3 rounded-lg transition-all", tipoGrafico === 'barra' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500')}><BarChart3 size={16} /></button>
                                <button onClick={() => setTipoGrafico("pizza")} className={cn("px-3 rounded-lg transition-all", tipoGrafico === 'pizza' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-zinc-500')}><PieIcon size={16} /></button>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full pt-4">
                        {isLoading ? (
                            <div className="h-full flex items-center justify-center font-black uppercase italic text-zinc-800 animate-pulse tracking-[0.2em]">Sincronizando...</div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                {tipoGrafico === "barra" ? (
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.05} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={140} fontSize={10} fontWeight="900" tick={{ fill: '#71717a' }} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', color: '#fff' }}
                                            formatter={(val) => metrica === 'preco_total' ? `R$ ${Number(val).toFixed(2)}` : `${val} Unidades`}
                                        />
                                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={25}>
                                            {chartData.map((entry, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={COLORS[i % COLORS.length]}
                                                    fillOpacity={0.8}
                                                    stroke={COLORS[i % COLORS.length]}
                                                    strokeWidth={1}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                ) : (
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%" cy="50%"
                                            outerRadius={120}
                                            innerRadius={85}
                                            paddingAngle={8}
                                        >
                                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                                        </Pie>
                                        <Tooltip formatter={(val) => metrica === 'preco_total' ? `R$ ${Number(val).toFixed(2)}` : `${val} Unidades`} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#71717a' }} />
                                    </PieChart>
                                )}
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center font-black text-zinc-900 uppercase italic">Dados indisponíveis para este ciclo.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}