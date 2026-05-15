"use client"

import { useState } from "react"
import { Download, Loader2, FileType } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function LezhinDownloader() {
  const [urlMestra, setUrlMestra] = useState("")
  const [total, setTotal] = useState("60")
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    if (!urlMestra) return toast.error("Insira a URL da imagem 1");

    setLoading(true);
    const toastId = toast.loading("Capturando imagens Lezhin...");

    try {
      const res = await fetch("/api/admin/scrapper/lezhin", {
        method: "POST",
        body: JSON.stringify({ urlMestra, totalImagens: Number(total) }),
      });

      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lezhin_capitulo.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success("Capítulo baixado!", { id: toastId });
    } catch (err) {
      toast.error("Erro no download. A URL pode ter expirado.", { id: toastId });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-muted/20 border border-white/5 p-6 rounded-[2rem] max-w-2xl">
      <h2 className="text-xs font-black uppercase italic mb-4 flex items-center gap-2">
        <FileType size={16} className="text-primary" /> Lezhin Cloud Scraper
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">URL da Imagem 1 (Com Signature)</label>
          <textarea 
            placeholder="Cole aqui a URL completa do 1.webp..." 
            value={urlMestra}
            onChange={(e) => setUrlMestra(e.target.value)}
            className="w-full bg-muted/50 border-none rounded-xl p-4 text-[10px] font-mono h-24 outline-none focus:ring-1 focus:ring-primary transition-all text-zinc-300"
          />
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-[9px] font-black uppercase text-zinc-500 ml-2">Qtd Imagens (Máx)</label>
            <Input 
              type="number"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              className="bg-muted/50 border-none h-11 font-bold italic"
            />
          </div>
          <Button 
            onClick={handleDownload}
            disabled={loading}
            className="h-11 px-8 rounded-xl font-black uppercase italic gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Baixar ZIP
          </Button>
        </div>
        
        <p className="text-[8px] text-zinc-600 uppercase font-bold italic ml-2">
          * A Lezhin usa URLs temporárias. Gere a URL e baixe imediatamente.
        </p>
      </div>
    </div>
  )
}