"use client"

import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  CartesianGrid 
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RevenueData {
  mes_nome: string
  total: number | string
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  // Formata os dados para garantir que o Recharts entenda os números
  const chartData = data.map(item => ({
    name: item.mes_nome,
    total: Number(item.total)
  }))

  return (
    <Card className="col-span-4 bg-zinc-950 border-white/5 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase italic tracking-widest text-primary">
          Fluxo de Faturamento Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => value.toUpperCase()}
              />
              <YAxis
                stroke="#52525b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${value}`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-2xl">
                        <p className="text-[10px] font-black uppercase text-zinc-500 mb-1">
                          {payload[0].payload.name}
                        </p>
                        <p className="text-sm font-black text-emerald-400 italic">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value as number)}
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}