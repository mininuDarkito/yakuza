"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Bot, Plus, RefreshCw, Download, Loader2, CheckCircle2, XCircle,
  Terminal, ExternalLink, ArrowLeft, Clock, Zap, Shield, Search,
  ChevronDown, ChevronUp, BookOpen, Filter
} from "lucide-react"

// ==========================================
// TYPES
// ==========================================
interface MechaSeries {
  id: string
  url: string
  title: string
  cover_url: string | null
  created_at: string
  _count: { chapters: number; subscriptions: number }
}

interface MechaChapter {
  id: string
  mecha_id: string
  chapter_url: string
  chapter_title: string | null
  chapter_number: string | null
  status: string | null
  cost: string | null
  downloads: {
    id: string
    status: string
    drive_link: string | null
    stitch_mode: boolean
    error: string | null
    created_at: string
  }[]
}

interface DownloadStatus {
  id: string
  status: string
  drive_link: string | null
  error: string | null
  chapter: {
    chapter_title: string | null
    chapter_number: string | null
  }
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export function MechaComicPanel() {
  // Tela principal: "series-list" | "chapter-view"
  const [view, setView] = useState<"series-list" | "chapter-view">("series-list")

  // Estado global
  const [series, setSeries] = useState<MechaSeries[]>([])
  const [hasAuth, setHasAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  // Adicionar série
  const [newUrl, setNewUrl] = useState("")
  const [adding, setAdding] = useState(false)

  // Capítulos
  const [selectedSeries, setSelectedSeries] = useState<MechaSeries | null>(null)
  const [seriesDetail, setSeriesDetail] = useState<any>(null)
  const [chapters, setChapters] = useState<MechaChapter[]>([])
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set())
  const [stitchMode, setStitchMode] = useState(true)
  const [chapterFilter, setChapterFilter] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  
  // Quick Download
  const [quickInput, setQuickInput] = useState<Record<string, string>>({})
  const [quickLoading, setQuickLoading] = useState<Record<string, boolean>>({})

  // Downloads
  const [downloading, setDownloading] = useState(false)
  const [activeDownloads, setActiveDownloads] = useState<DownloadStatus[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll do terminal
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`])

  // ==========================================
  // DATA FETCHING
  // ==========================================
  const fetchSeries = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/mechacomic/series")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSeries(data.series || [])
      setHasAuth(data.hasAuth)
    } catch {
      toast.error("Erro ao carregar séries")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  const fetchChapters = async (seriesId: string) => {
    try {
      const res = await fetch(`/api/admin/mechacomic/chapters?seriesId=${seriesId}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSeriesDetail(data.series)
      setChapters(data.chapters || [])
    } catch {
      toast.error("Erro ao carregar capítulos")
    }
  }

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleAddSeries = async () => {
    if (!newUrl.trim()) return
    setAdding(true)
    addLog(`Analisando série: ${newUrl}`)

    try {
      const res = await fetch("/api/admin/mechacomic/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Série "${data.series?.title}" adicionada com ${data.chaptersCount} capítulos!`)
        addLog(`✅ ${data.series?.title} - ${data.chaptersCount} capítulos sincronizados`)
        setNewUrl("")
        fetchSeries()
      } else {
        toast.error(data.error)
        addLog(`❌ ${data.error}`)
      }
    } catch {
      toast.error("Erro de conexão")
      addLog("❌ Falha na conexão com o servidor")
    } finally {
      setAdding(false)
    }
  }

  const handleRefreshChapters = async () => {
    if (!selectedSeries) return
    setRefreshing(true)
    addLog(`Atualizando capítulos: ${selectedSeries.title}`)

    try {
      const res = await fetch("/api/admin/mechacomic/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: selectedSeries.id })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.newChapters} capítulos novos encontrados!`)
        addLog(`✅ ${data.totalChapters} total | ${data.newChapters} novos`)
        fetchChapters(selectedSeries.id)
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error("Erro ao atualizar")
    } finally {
      setRefreshing(false)
    }
  }

  const handleDownload = async () => {
    if (selectedChapters.size === 0) return
    setDownloading(true)
    const ids = Array.from(selectedChapters)
    addLog(`Iniciando download de ${ids.length} capítulo(s)... Stitch: ${stitchMode ? "ON" : "OFF"}`)

    try {
      const res = await fetch("/api/admin/mechacomic/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: ids, stitchMode })
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message)
        addLog(`📥 ${data.downloadIds.length} downloads iniciados`)
        setSelectedChapters(new Set())

        // Iniciar polling de status
        startPolling(data.downloadIds)
      } else {
        toast.error(data.error)
        addLog(`❌ ${data.error}`)
        setDownloading(false)
      }
    } catch {
      toast.error("Erro ao iniciar downloads")
      setDownloading(false)
    }
  }

  const handleQuickDownload = async (seriesId: string) => {
    const chapterNum = quickInput[seriesId]
    if (!chapterNum?.trim()) return

    setQuickLoading(prev => ({ ...prev, [seriesId]: true }))
    addLog(`Buscando capítulo ${chapterNum} rapidamente...`)

    try {
      // Busca o ID do capítulo
      const resSearch = await fetch("/api/admin/mechacomic/download/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, chapterNumber: chapterNum })
      })

      const dataSearch = await resSearch.json()
      if (!resSearch.ok) {
        toast.error(dataSearch.error)
        addLog(`❌ ${dataSearch.error}`)
        setQuickLoading(prev => ({ ...prev, [seriesId]: false }))
        return
      }

      const chapterId = dataSearch.chapterId
      addLog(`Capítulo encontrado! Iniciando download...`)

      // Inicia o download
      const resDl = await fetch("/api/admin/mechacomic/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: [chapterId], stitchMode: true }) // Usa SmartStitch por padrão no rápido
      })

      const dataDl = await resDl.json()
      if (resDl.ok) {
        toast.success(dataDl.message)
        addLog(`📥 Quick Download iniciado!`)
        // Limpa o input
        setQuickInput(prev => ({ ...prev, [seriesId]: "" }))
        // Inicia pooling
        startPolling(dataDl.downloadIds)
      } else {
        toast.error(dataDl.error)
        addLog(`❌ ${dataDl.error}`)
      }
    } catch {
      toast.error("Erro ao iniciar download rápido")
    } finally {
      setQuickLoading(prev => ({ ...prev, [seriesId]: false }))
    }
  }

  // ==========================================
  // POLLING
  // ==========================================
  const startPolling = (downloadIds: string[]) => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const idQuery = downloadIds.join(",")
        const res = await fetch(`/api/admin/mechacomic/downloads?chapterId=${downloadIds[0]}`)
        if (!res.ok) return
        const downloadsArray = await res.json()
        setActiveDownloads(downloadsArray || [])

        // Verificar se todos terminaram
        const allDone = downloadsArray?.every(
          (d: DownloadStatus) => d.status === "completed" || d.status === "failed"
        )

        if (allDone && downloadsArray?.length > 0) {
          if (pollRef.current) clearInterval(pollRef.current)
          setDownloading(false)

          const completed = downloadsArray.filter((d: DownloadStatus) => d.status === "completed").length
          const failed = downloadsArray.filter((d: DownloadStatus) => d.status === "failed").length

          addLog(`✅ Processamento finalizado: ${completed} sucesso, ${failed} falha(s)`)
          toast.success(`Downloads concluídos: ${completed}/${downloadsArray.length}`)

          // Refresh capítulos para mostrar links
          if (selectedSeries) fetchChapters(selectedSeries.id)
        }
      } catch { /* ignorar erros de polling */ }
    }, 3000) // Poll a cada 3 segundos
  }

  // Cleanup do polling
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ==========================================
  // CHAPTER SELECTION
  // ==========================================
  const toggleChapter = (id: string) => {
    setSelectedChapters(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const filtered = getFilteredChapters()
    if (selectedChapters.size === filtered.length) {
      setSelectedChapters(new Set())
    } else {
      setSelectedChapters(new Set(filtered.map(c => c.id)))
    }
  }

  const getFilteredChapters = () => {
    if (!chapterFilter.trim()) return chapters
    const q = chapterFilter.toLowerCase()
    return chapters.filter(
      c =>
        c.chapter_title?.toLowerCase().includes(q) ||
        c.chapter_number?.toLowerCase().includes(q)
    )
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "free": return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black">🆓 FREE</Badge>
      case "wait_free": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 text-[9px] font-black">⏳ WAIT</Badge>
      case "paid": return <Badge variant="secondary" className="bg-red-500/10 text-red-400 text-[9px] font-black">💰 PAID</Badge>
      default: return null
    }
  }

  const getDownloadBadge = (chapter: MechaChapter) => {
    const lastDownload = chapter.downloads?.[0]
    if (!lastDownload) return null

    switch (lastDownload.status) {
      case "completed":
        return (
          <a href={lastDownload.drive_link || "#"} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 hover:underline">
            <CheckCircle2 className="h-3 w-3" /> DRIVE
          </a>
        )
      case "processing":
        return <Badge variant="outline" className="text-[9px] animate-pulse text-blue-400 border-blue-400/30">⏳ Processando</Badge>
      case "pending":
        return <Badge variant="outline" className="text-[9px] text-zinc-500">Na fila</Badge>
      case "failed":
        return <Badge variant="destructive" className="text-[9px]">❌ Falhou</Badge>
      default: return null
    }
  }

  // ==========================================
  // RENDER: SERIES LIST
  // ==========================================
  if (view === "series-list") {
    return (
      <div className="space-y-6">
        {/* Auth Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase italic">
            <Shield className={cn("h-4 w-4", hasAuth ? "text-emerald-500" : "text-red-500")} />
            Sessão MechaComic: {hasAuth ? "Ativa" : "Sem sessão (Execute login no servidor)"}
          </div>
        </div>

        {/* Input para nova série */}
        <Card className="border-primary/20 bg-zinc-950">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://mechacomic.jp/books/XXXXX"
                className="bg-muted/50 border-none text-xs font-bold italic"
                onKeyDown={(e) => e.key === "Enter" && handleAddSeries()}
              />
              <Button
                onClick={handleAddSeries}
                disabled={adding || !newUrl.trim()}
                className="font-black uppercase italic text-[10px] min-w-[140px]"
              >
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {adding ? "Analisando..." : "Adicionar Série"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de séries */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : series.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Bot className="h-16 w-16 mx-auto text-zinc-700" />
            <p className="text-zinc-500 text-sm font-bold italic">Nenhuma série cadastrada</p>
            <p className="text-zinc-600 text-xs">Use o campo acima para adicionar uma série do MechaComic</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {series.map((s) => (
              <Card
                key={s.id}
                className="group border-white/5 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 bg-zinc-950 flex flex-col"
              >
                <CardContent 
                  className="p-4 flex gap-4 cursor-pointer"
                  onClick={() => {
                    setSelectedSeries(s)
                    setView("chapter-view")
                    fetchChapters(s.id)
                  }}
                >
                  {s.cover_url && (
                    <img
                      src={s.cover_url.startsWith("//") ? `https:${s.cover_url}` : s.cover_url}
                      alt={s.title}
                      className="w-16 h-24 rounded-lg object-cover border border-white/10"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h3 className="font-black text-sm italic truncate group-hover:text-primary transition-colors">
                      {s.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> {s._count.chapters} caps
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-600 truncate font-mono">{s.url}</p>
                  </div>
                </CardContent>
                
                {/* Quick Download Footer */}
                <div className="mt-auto border-t border-white/5 p-3 flex gap-2 bg-black/20">
                  <Input 
                    placeholder="Nº Cap (ex: 3)" 
                    className="h-8 text-[10px] font-bold bg-zinc-900 border-none"
                    value={quickInput[s.id] || ""}
                    onChange={(e) => setQuickInput(prev => ({ ...prev, [s.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleQuickDownload(s.id)
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    className="h-8 text-[10px] font-black italic bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQuickDownload(s.id)
                    }}
                    disabled={quickLoading[s.id] || !quickInput[s.id]?.trim()}
                  >
                    {quickLoading[s.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Active Downloads Progress - Movido para fora para aparecer nas duas views */}
        {activeDownloads.length > 0 && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-[10px] font-black uppercase italic text-blue-400 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloads em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {activeDownloads.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold italic truncate flex-1">
                    {d.chapter?.chapter_title || d.chapter?.chapter_number}
                  </span>
                  <span className={cn(
                    "font-black uppercase text-[9px]",
                    d.status === "completed" ? "text-emerald-400" :
                    d.status === "failed" ? "text-red-400" :
                    d.status === "processing" ? "text-blue-400 animate-pulse" :
                    "text-zinc-500"
                  )}>
                    {d.status === "completed" && d.drive_link ? (
                      <a href={d.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                        <CheckCircle2 className="h-3 w-3" /> Pronto
                      </a>
                    ) : d.status === "failed" ? (
                      <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> {d.error?.substring(0, 30)}</span>
                    ) : (
                      d.status
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Terminal Log */}
        {logs.length > 0 && <TerminalLog logs={logs} logEndRef={logEndRef} />}
      </div>
    )
  }

  // ==========================================
  // RENDER: CHAPTER VIEW
  // ==========================================
  const filteredChapters = getFilteredChapters()

  return (
    <div className="space-y-4">
      {/* Header com voltar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setView("series-list"); setSelectedChapters(new Set()) }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h3 className="font-black text-lg italic truncate">{selectedSeries?.title}</h3>
            <p className="text-[10px] text-zinc-500 font-mono truncate">{selectedSeries?.url}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshChapters} disabled={refreshing}
            className="font-black uppercase italic text-[10px]">
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <Card className="border-primary/20 bg-zinc-950">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              placeholder="Filtrar capítulos..."
              className="pl-9 bg-muted/50 border-none text-xs font-bold italic h-9"
            />
          </div>

          {/* Stitch Toggle */}
          <div className="flex items-center gap-2">
            <Switch checked={stitchMode} onCheckedChange={setStitchMode} />
            <span className="text-[10px] font-black uppercase italic text-zinc-400">
              SmartStitch {stitchMode ? "ON" : "OFF"}
            </span>
          </div>

          {/* Select All */}
          <Button variant="outline" size="sm" onClick={selectAll}
            className="font-black uppercase italic text-[10px]">
            {selectedChapters.size === filteredChapters.length ? "Desmarcar" : "Selecionar"} Todos
          </Button>

          {/* Download Button */}
          <Button
            onClick={handleDownload}
            disabled={selectedChapters.size === 0 || downloading}
            className="font-black uppercase italic text-[10px] bg-primary hover:opacity-90 min-w-[160px]"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {downloading ? "Processando..." : `Baixar (${selectedChapters.size})`}
          </Button>
        </CardContent>
      </Card>

      {/* Active Downloads Progress */}
      {activeDownloads.length > 0 && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-[10px] font-black uppercase italic text-blue-400 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Downloads em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {activeDownloads.map(d => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="font-bold italic truncate flex-1">
                  {d.chapter?.chapter_title || d.chapter?.chapter_number}
                </span>
                <span className={cn(
                  "font-black uppercase text-[9px]",
                  d.status === "completed" ? "text-emerald-400" :
                  d.status === "failed" ? "text-red-400" :
                  d.status === "processing" ? "text-blue-400 animate-pulse" :
                  "text-zinc-500"
                )}>
                  {d.status === "completed" && d.drive_link ? (
                    <a href={d.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                      <CheckCircle2 className="h-3 w-3" /> Pronto
                    </a>
                  ) : d.status === "failed" ? (
                    <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> {d.error?.substring(0, 30)}</span>
                  ) : (
                    d.status
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Chapter List */}
      <ScrollArea className="h-[500px] rounded-xl border border-white/5">
        <div className="space-y-1 p-2">
          {filteredChapters.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm font-bold italic">
              {chapters.length === 0 ? "Carregando capítulos..." : "Nenhum resultado encontrado"}
            </div>
          ) : (
            filteredChapters.map((ch) => (
              <div
                key={ch.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 transition-all cursor-pointer group",
                  selectedChapters.has(ch.id) 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-white/[0.02] border border-transparent"
                )}
                onClick={() => toggleChapter(ch.id)}
              >
                <Checkbox
                  checked={selectedChapters.has(ch.id)}
                  onCheckedChange={() => toggleChapter(ch.id)}
                  className="data-[state=checked]:bg-primary"
                />

                <div className="flex-1 min-w-0 flex items-center gap-3">
                  <span className="text-xs font-black italic text-zinc-300 w-20 shrink-0 truncate">
                    {ch.chapter_number}
                  </span>
                  <span className="text-xs font-bold italic text-zinc-400 truncate flex-1">
                    {ch.chapter_title || "—"}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusIcon(ch.status)}
                  {ch.cost && ch.cost !== "0" && (
                    <span className="text-[9px] text-zinc-600 font-bold">{ch.cost}pt</span>
                  )}
                  {getDownloadBadge(ch)}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Terminal Log */}
      {logs.length > 0 && <TerminalLog logs={logs} logEndRef={logEndRef} />}
    </div>
  )
}

// ==========================================
// TERMINAL LOG COMPONENT
// ==========================================
function TerminalLog({ logs, logEndRef }: { logs: string[]; logEndRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-[2rem] p-4 font-mono text-[10px] h-[200px] overflow-hidden flex flex-col shadow-inner">
      <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2 text-zinc-500">
        <Terminal size={12} />
        <span className="uppercase font-black italic tracking-widest">System Log</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2">
        {logs.map((log, i) => (
          <div key={i} className={cn(
            "leading-relaxed",
            log.includes("❌") || log.includes("ERRO") ? "text-red-400" :
            log.includes("✅") ? "text-emerald-400" :
            "text-emerald-400/80"
          )}>
            {log}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  )
}
