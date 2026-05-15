"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, Link as LinkIcon, RefreshCw, FileImage } from "lucide-react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function SeriesDetailsPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const resolvedParams = use(params);
  const seriesId = resolvedParams.seriesId;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const initialPage = parseInt(searchParams.get('page') || '1');

  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stitchMode, setStitchMode] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalChapters, setTotalChapters] = useState(0);
  const [accountPoints, setAccountPoints] = useState<string>("...");

  const fetchPoints = async () => {
    try {
      const res = await fetch('/api/admin/mechacomic/account');
      if (res.ok) {
        const data = await res.json();
        setAccountPoints(data.points);
      }
    } catch (e) {}
  };

  // Sincroniza a URL quando a página muda
  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
    setPage(newPage);
    setLoading(true);
  };

  useEffect(() => {
    fetchChapters();
    fetchPoints();
    const interval = setInterval(fetchChapters, 10000); // Polling simples
    return () => clearInterval(interval);
  }, [page]);

  const fetchChapters = async () => {
    try {
      const res = await fetch(`/api/admin/mechacomic/chapters?seriesId=${seriesId}&page=${page}&limit=20&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setChapters(data.chapters);
        setTotalPages(data.totalPages);
        setTotalChapters(data.total);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const allIdsOnPage = chapters.map(c => c.id);
    const allSelected = allIdsOnPage.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(selectedIds.filter(id => !allIdsOnPage.includes(id)));
    } else {
      const newSelected = [...selectedIds];
      allIdsOnPage.forEach(id => {
        if (!newSelected.includes(id)) newSelected.push(id);
      });
      setSelectedIds(newSelected);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDownload = async () => {
    if (selectedIds.length === 0) return;

    setDownloading(true);
    try {
      const res = await fetch('/api/admin/mechacomic/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterIds: selectedIds,
          stitchMode
        })
      });

      if (res.ok) {
        toast.success("Download(s) iniciado(s) em background!");
        setSelectedIds([]);
        fetchChapters();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao iniciar download");
      }
    } catch (e) {
      toast.error("Erro de conexão");
    } finally {
      setDownloading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const toastId = toast.loading("Sincronizando com MechaComic e Drive...");
    try {
      const res = await fetch('/api/admin/mechacomic/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Sincronização concluída!", { id: toastId });
        if (data.points) setAccountPoints(data.points);
        fetchChapters();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro na sincronização", { id: toastId });
      }
    } catch (e) {
      toast.error("Erro de conexão", { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            Gerenciar Capítulos
          </h1>
          <div className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full flex items-center gap-2 shadow-inner">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-black uppercase text-zinc-400">Saldo Mecha:</span>
            <span className="text-sm font-black text-primary font-mono">{accountPoints} pt</span>
            <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-zinc-800" onClick={fetchPoints}>
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 bg-accent/50 p-2 rounded-lg border">
            <Switch id="stitch-mode" checked={stitchMode} onCheckedChange={setStitchMode} />
            <Label htmlFor="stitch-mode" className="flex items-center gap-1 cursor-pointer">
              <FileImage className="w-4 h-4 text-primary" />
              SmartStitch
            </Label>
          </div>
          <Button onClick={handleSync} variant="outline" size="sm" disabled={syncing} className="gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sincronizar (Mecha & Drive)
          </Button>
          <Button onClick={fetchChapters} variant="outline" size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handleDownload} disabled={selectedIds.length === 0 || downloading}>
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Baixar ({selectedIds.length})
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-zinc-950/50">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900/80 text-muted-foreground uppercase text-[10px] font-black italic border-b border-zinc-800">
            <tr>
              <th className="p-3 w-10">
                <Checkbox
                  checked={chapters.length > 0 && chapters.every(c => selectedIds.includes(c.id))}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="p-3">Capítulo</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Custo</th>
              <th className="p-3">Download Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td>
              </tr>
            ) : chapters.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum capítulo encontrado.</td>
              </tr>
            ) : (
              chapters.map(chapter => {
                const latestDownload = chapter.downloads?.[chapter.downloads.length - 1];

                return (
                  <tr key={chapter.id} className="border-t border-zinc-900 hover:bg-zinc-900/50 transition-colors">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedIds.includes(chapter.id)}
                        onCheckedChange={() => toggleSelect(chapter.id)}
                      />
                    </td>
                    <td className="p-3 font-medium">
                      <a href={chapter.chapter_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-2">
                        {chapter.chapter_number} - {chapter.chapter_title}
                        <LinkIcon className="w-3 h-3 text-muted-foreground" />
                      </a>
                    </td>
                    <td className="p-3 text-center">
                      {chapter.status === 'free' && <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Free</span>}
                      {chapter.status === 'purchased' && <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Comprado</span>}
                      {chapter.status === 'paid' && <span className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-[10px] font-black uppercase">Pago</span>}
                      {chapter.status === 'wait_free' && <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-[10px] font-black uppercase text-nowrap">Aguardar Free</span>}
                    </td>
                    <td className="p-3 text-center font-mono text-[11px]">
                      {chapter.cost !== "0" && chapter.cost ? `${chapter.cost} pt` : "-"}
                    </td>
                    <td className="p-3">
                      {!latestDownload && <span className="text-muted-foreground">-</span>}
                      {latestDownload?.status === 'pending' && <span className="text-yellow-500 flex items-center gap-1 text-[11px] font-black uppercase"><Loader2 className="w-3 h-3 animate-spin" /> Na Fila</span>}
                      {latestDownload?.status === 'processing' && <span className="text-blue-500 flex items-center gap-1 text-[11px] font-black uppercase"><Loader2 className="w-3 h-3 animate-spin" /> Processando</span>}
                      {latestDownload?.status === 'completed' && (
                        <div className="flex items-center gap-3">
                          <a href={latestDownload.drive_link} target="_blank" rel="noreferrer" className="text-green-500 flex items-center gap-1 hover:underline font-black text-[11px] uppercase">
                            <Download className="w-3 h-3" /> Drive
                          </a>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[10px] font-black uppercase text-zinc-300 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              const series = chapter.series;
                              const cover = series?.cover_url?.startsWith("//") ? `https:${series.cover_url}` : series?.cover_url;
                              const chapterFull = `${chapter.chapter_number || ''} ${chapter.chapter_title ? '- ' + chapter.chapter_title : ''}`.trim();
                              const text = `Série: [${series?.title || 'Série Desconhecida'}](${cover})\n\nCap: ${chapterFull}\n\nLink Drive: ${latestDownload.drive_link}`;
                              navigator.clipboard.writeText(text);
                              toast.success("Mensagem copiada para o Discord!");
                            }}
                          >
                            Copiar Discord
                          </Button>
                        </div>
                      )}
                      {latestDownload?.status === 'failed' && <span className="text-red-500 text-[10px] font-black uppercase" title={latestDownload.error}>Erro</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Paginação */}
        <div className="p-4 border-t border-zinc-900 flex items-center justify-between bg-zinc-900/30">
          <p className="text-[10px] uppercase font-black text-muted-foreground">
            Total: {totalChapters} capítulos • Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => updatePage(page - 1)}
              className="h-8 text-[10px] font-black uppercase"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => updatePage(page + 1)}
              className="h-8 text-[10px] font-black uppercase"
            >
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
