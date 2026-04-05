"use client"

import { DollarSign, TrendingUp, Package, Percent } from "lucide-react"
import { cn } from "@/lib/utils"

interface VendasStatsProps {
  totalFaturado: number
  totalCapitulos: number
  mediaPorCapitulo: number
  quantidadeSeries: number
}

export function VendasStats({ 
  totalFaturado = 0, 
  totalCapitulos = 0, 
  mediaPorCapitulo = 0,
  quantidadeSeries = 0 
}: VendasStatsProps) {
  
  // Formatador de moeda reaproveitável
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { 
      style: "currency", 
      currency: "USD" 
    }).format(isNaN(value) ? 0 : value);

  const stats = [
    {
      label: "Faturamento Total",
      value: formatCurrency(totalFaturado),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20"
    },
    {
      label: "Capítulos Postados",
      value: totalCapitulos,
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20"
    },
    {
      label: "Média p/ Capítulo",
      value: formatCurrency(mediaPorCapitulo),
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      label: "Séries Ativas",
      value: quantidadeSeries,
      icon: Percent,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div 
          key={index} 
          className="bg-muted/20 border border-white/5 p-5 rounded-[2rem] flex items-center gap-4 hover:bg-muted/30 transition-all group shadow-sm"
        >
          <div className={cn(
            "p-3 rounded-2xl border transition-transform group-hover:scale-110", 
            stat.bg,
            stat.border
          )}>
            <stat.icon className={cn("h-5 w-5", stat.color)} />
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase italic leading-none mb-1 text-zinc-500">
              {stat.label}
            </p>
            <p className="text-xl font-black italic tracking-tight ">
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}