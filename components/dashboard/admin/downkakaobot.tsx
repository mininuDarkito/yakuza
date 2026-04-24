"use client"

import { useState, useRef, useEffect } from "react"
import { Download, Terminal, CheckCircle2, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function KakaoDownloader() {
  const [idObra, setIdObra] = useState("")
  const [capitulos, setCapitulos] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [progresso, setProgresso] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)

  // Scroll automático do terminal
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const addLog = (msg: string) => setLogs(prev => [...prev, `> ${msg}`])

  async function handleProcess() {
    setStatus("loading")
    setLogs(["Iniciando Scraper v2.0..."])
    setProgresso(5)

    try {
      const res = await fetch("/api/admin/scrapper/kakao", {
        method: "POST",
        body: JSON.stringify({ idObra, capitulos }),
      })

      if (!res.ok) throw new Error()

      // Lógica de download do arquivo final (Blob)
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kakao_${idObra}_caps_${capitulos}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()

      setStatus("success")
      setProgresso(100)
      addLog("Download concluído com sucesso!")
    } catch (err) {
      setStatus("error")
      addLog("ERRO: Falha na conexão ou arquivo corrompido.")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
      {/* PAINEL DE CONTROLE */}
      <div className="bg-muted/20 border border-white/5 p-6 rounded-[2rem] space-y-4">
        <h2 className="text-xs font-black uppercase italic flex items-center gap-2">
          <Download size={16} className="text-primary" /> Painel de Captura
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <input 
            value={idObra} 
            onChange={e => setIdObra(e.target.value)}
            placeholder="ID DA OBRA"
            className="bg-muted/50 border-none rounded-xl h-11 px-4 text-xs font-bold italic outline-none"
          />
          <input 
            value={capitulos} 
            onChange={e => setCapitulos(e.target.value)}
            placeholder="CAPS (ex: 1-5)"
            className="bg-muted/50 border-none rounded-xl h-11 px-4 text-xs font-bold italic outline-none"
          />
        </div>

        <Button 
          onClick={handleProcess} 
          disabled={status === "loading"}
          className="w-full h-12 rounded-2xl font-black uppercase italic bg-primary hover:opacity-90"
        >
          {status === "loading" ? <Loader2 className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
          {status === "loading" ? "Processando no Servidor..." : "Baixar para meu PC"}
        </Button>

        {status === "loading" && (
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-black italic text-primary">
              <span>PROGRESSO</span>
              <span>{progresso}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* TERMINAL LOG */}
      <div className="bg-black/40 border border-white/5 rounded-[2rem] p-4 font-mono text-[10px] h-[250px] overflow-hidden flex flex-col shadow-inner">
        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2 text-zinc-500">
          <Terminal size={12} />
          <span className="uppercase font-black italic tracking-widest">System Log</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2">
          {logs.map((log, i) => (
            <div key={i} className={cn(
              "leading-relaxed",
              log.includes("ERRO") ? "text-red-400" : "text-emerald-400/80"
            )}>
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  )
}