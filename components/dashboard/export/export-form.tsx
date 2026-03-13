"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Download, FileSpreadsheet, FolderOpen, Package, ShoppingCart } from "lucide-react"
import { format, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { Label } from "@/components/ui/label"

interface Grupo {
  id: string
  nome: string
}

interface ExportFormProps {
  grupos: Grupo[]
}

export function ExportForm({ grupos }: ExportFormProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [grupoId, setGrupoId] = useState<string>("")
  const [isCalendarOpen, setIsCalendarOpen] = useState(false) // Controle manual do popover
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  })

  const handleExport = async (type: string) => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({ type })
      
      if (type === "vendas") {
        // Só envia o ID se não for a opção "todos"
        if (grupoId && grupoId !== "all") params.append("grupo_id", grupoId)
        if (dateRange?.from) params.append("start_date", format(dateRange.from, "yyyy-MM-dd"))
        if (dateRange?.to) params.append("end_date", format(dateRange.to, "yyyy-MM-dd"))
      }

      const response = await fetch(`/api/export?${params.toString()}`)
      
      if (!response.ok) throw new Error("Erro ao exportar dados")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      // Sanitização do nome do arquivo vindo do header
      const contentDisposition = response.headers.get("Content-Disposition")
      const fileName = contentDisposition 
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "") 
        : `${type}_${format(new Date(), "ddMMyyyy")}.csv`

      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Dados exportados com sucesso")
    } catch (error) {
      toast.error("Erro ao gerar arquivo de exportação")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* CARD VENDAS */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Exportar Vendas
          </CardTitle>
          <CardDescription>
            Exporte vendas com filtros de grupo e período.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="space-y-2">
            <Label>Grupo</Label>
            <Select value={grupoId} onValueChange={setGrupoId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                {grupos.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Período</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione um período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range)
                    // Fecha o popover se o usuário selecionou o fim do range
                    if (range?.from && range?.to) setIsCalendarOpen(false)
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={() => handleExport("vendas")}
            disabled={isExporting}
            className="w-full mt-auto"
          >
            {isExporting ? <Download className="mr-2 h-4 w-4 animate-bounce" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? "Exportando..." : "Exportar Vendas"}
          </Button>
        </CardContent>
      </Card>

      {/* CARD PRODUTOS */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Exportar Produtos
          </CardTitle>
          <CardDescription>
            Lista completa de produtos cadastrados.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1">
          <div className="flex items-center gap-3 rounded-lg border p-4 bg-muted/50 mb-6">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Dados inclusos</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nome, descrição, preço, grupo e status.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleExport("produtos")}
            disabled={isExporting}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar Produtos"}
          </Button>
        </CardContent>
      </Card>

      {/* CARD GRUPOS */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Exportar Grupos
          </CardTitle>
          <CardDescription>
            Resumo de grupos, produtos e vendas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col justify-between flex-1">
          <div className="flex items-center gap-3 rounded-lg border p-4 bg-muted/50 mb-6">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Dados inclusos</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nome, total de produtos e total vendido.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleExport("grupos")}
            disabled={isExporting}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exportando..." : "Exportar Grupos"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}