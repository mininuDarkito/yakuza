"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Zap, CheckCircle2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

// --- TIPAGEM DOS DADOS ---
interface PreviewData {
  nome: string;
  descricao: string;
  imagem_url: string;
}

// --- COMPONENTE DE PREVIEW ---
function PreviewCard({ data }: { data: PreviewData }) {
  return (
    <div className="mt-4 p-4 bg-zinc-900 border border-primary/20 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-2">
      {data.imagem_url && (
        <img 
          src={data.imagem_url} 
          alt={data.nome} 
          className="h-24 w-16 object-cover rounded-lg shadow-lg border border-white/10"
        />
      )}
      <div className="flex-1 space-y-1">
        <p className="text-[10px] font-black text-primary uppercase italic tracking-widest">Preview Detectado</p>
        <h4 className="font-black text-sm uppercase italic text-white line-clamp-1">{data.nome}</h4>
        <p className="text-[10px] text-zinc-500 font-bold leading-tight line-clamp-2 italic">
          {data.descricao || "Sem descrição disponível para esta obra."}
        </p>
      </div>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function BulkScraperForm() {
  const [loading, setLoading] = useState(false)
  const [links, setLinks] = useState("")
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const router = useRouter()

  // Função para capturar link e gerar preview em tempo real
  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setLinks(value)

    // Pega o último link válido colado
    const lastLink = value.split(/[\s,\n,]+/).filter(l => l.startsWith('http')).pop()
    
    if (lastLink) {
      setIsPreviewLoading(true)
      try {
        const res = await fetch("/api/admin/produtos/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: lastLink })
        })
        if (res.ok) {
          const data = await res.json()
          setPreview(data)
        } else {
          setPreview(null)
        }
      } catch (err) {
        setPreview(null)
      } finally {
        setIsPreviewLoading(false)
      }
    } else {
      setPreview(null)
    }
  }

  // Função para salvar tudo no banco
  const handleMagicInsert = async () => {
    if (!links.trim()) return toast.error("Cole os links primeiro!")

    setLoading(true)
    try {
      const res = await fetch("/api/admin/produtos/auto-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Sucesso: ${data.sucessos} obras registradas!`, {
          description: data.falhas > 0 ? `${data.falhas} links falharam.` : "Catálogo atualizado com sucesso.",
        })
        setLinks("")
        setPreview(null)
        router.refresh()
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar links")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-950 p-6 rounded-[2rem] border-2 border-dashed border-white/5 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10">
          <Zap className="h-24 w-24 text-primary" />
        </div>

        <div className="space-y-2 mb-4">
          <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
            Yakuza Auto-Scraper
          </h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase italic">
            Cole os links (AC.QQ, Ridi, Manta, Kuaikan, Kakao ou MechaComic) um por linha
          </p>
        </div>

        <Textarea 
          placeholder="https://manta.net/series/...&#10;https://ridibooks.com/books/..." 
          className="min-h-[200px] bg-black/50 border-white/10 font-mono text-xs text-primary focus-visible:ring-primary rounded-xl"
          value={links}
          onChange={handleTextChange}
        />

        {/* ÁREA DE PREVIEW DINÂMICO */}
        {isPreviewLoading && (
          <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase italic text-zinc-500 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" /> Identificando obra...
          </div>
        )}

        {preview && !isPreviewLoading && <PreviewCard data={preview} />}

        <Button 
          onClick={handleMagicInsert} 
          disabled={loading || !links.trim()}
          className="w-full mt-4 h-12 font-black uppercase italic bg-primary text-black hover:bg-primary/90 rounded-xl transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando Metadados...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4 fill-current" />
              Iniciar Importação Global
            </>
          )}
        </Button>
      </div>

      {/* Dicas de Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase">Auto-Clean</p>
            <p className="text-[9px] text-zinc-500 font-bold italic">Remove tags de marketing e limpa os títulos automaticamente.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/50 border border-white/5">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase">HD Assets</p>
            <p className="text-[9px] text-zinc-500 font-bold italic">Busca a versão de alta resolução e processa imagens bloqueadas.</p>
          </div>
        </div>
      </div>
    </div>
  )
}