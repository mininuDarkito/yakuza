"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Users, Download, Loader2, CheckCircle2, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SeriesCardProps {
  series: any;
  onUpdate?: () => void;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const router = useRouter();
  const [chapterNum, setChapterNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [completedChapter, setCompletedChapter] = useState<any>(null);
  
  // Edit Name
  const [editOpen, setEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(series.title);
  const [updating, setUpdating] = useState(false);

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!chapterNum.trim()) return;

    setLoading(true);
    setDriveLink(null);
    const toastId = toast.loading(`Buscando capítulo ${chapterNum}...`);

    try {
      // 1. Acha o ID do capítulo
      const resSearch = await fetch("/api/admin/mechacomic/download/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId: series.id, chapterNumber: chapterNum })
      });

      const dataSearch = await resSearch.json();
      if (!resSearch.ok) {
        toast.error(dataSearch.error, { id: toastId });
        setLoading(false);
        return;
      }

      toast.loading("Baixando e processando imagens...", { id: toastId });

      // 2. Inicia o download (agora podemos esperar ou fazer polling simplificado)
      // Como o usuário quer ver o link no card, vamos chamar a API padrão e depois fazer polling
      const resDl = await fetch("/api/admin/mechacomic/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: [dataSearch.chapterId], stitchMode: true })
      });

      const dataDl = await resDl.json();
      if (!resDl.ok) {
        toast.error(dataDl.error || "Erro ao iniciar download", { id: toastId });
        setLoading(false);
        return;
      }

      // 3. Polling simplificado
      const poll = setInterval(async () => {
        try {
          // A rota plural com ?chapterId= retorna um array dos downloads desse capítulo
          const resPoll = await fetch(`/api/admin/mechacomic/downloads?chapterId=${dataSearch.chapterId}`);
          if (!resPoll.ok) return;
          const downloadsArray = await resPoll.json();
          const dlStatus = downloadsArray[0]; // Pega o mais recente

          if (dlStatus) {
            if (dlStatus.status === "completed") {
              clearInterval(poll);
              toast.success("Download concluído com sucesso!", { id: toastId });
              setDriveLink(dlStatus.drive_link);
              setCompletedChapter(dlStatus.chapter);
              setLoading(false);
              setChapterNum(""); // reseta o input
            } else if (dlStatus.status === "failed") {
              clearInterval(poll);
              toast.error(`Falha: ${dlStatus.error}`, { id: toastId });
              setLoading(false);
            }
          }
        } catch (e) { }
      }, 3000);

    } catch (err) {
      toast.error("Erro interno ao baixar", { id: toastId });
      setLoading(false);
    }
  };

  const handleRename = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTitle.trim() || newTitle === series.title) return setEditOpen(false);

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/mechacomic/series', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: series.id, title: newTitle })
      });

      if (res.ok) {
        toast.success("Título atualizado!");
        setEditOpen(false);
        if (onUpdate) onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao renomear");
      }
    } catch (e) {
      toast.error("Erro de conexão");
    } finally {
      setUpdating(false);
    }
  };

  const navigateToSeries = () => {
    router.push(`/dashboard/admin/mechacomic/${series.id}`);
  };

  return (
    <Card 
      onClick={navigateToSeries}
      className="hover:border-primary transition-colors cursor-pointer h-full flex flex-col overflow-hidden group bg-zinc-950"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        {series.cover_url ? (
          <img 
            src={series.cover_url} 
            alt={series.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Sem Capa
          </div>
        )}

        {/* Botão de Editar */}
        <div 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-lg">
                <Pencil className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Renomear Série</DialogTitle>
                <DialogDescription>
                  Ajuste o nome para bater com a pasta no Google Drive se necessário.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Nome da Obra</Label>
                <Input 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nome limpo da obra"
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={handleRename} disabled={updating || !newTitle.trim()}>
                  {updating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg line-clamp-2">{series.title}</CardTitle>
        <CardDescription className="text-xs truncate">{series.url}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 mt-auto flex justify-between text-muted-foreground text-sm">
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          <span>{series._count?.chapters || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{series._count?.subscriptions || 0}</span>
        </div>
      </CardContent>

      {/* QUICK DOWNLOAD SECTION */}
      <div 
        className="mt-auto border-t border-white/10 p-3 bg-black/40 space-y-2"
        onClick={(e) => e.stopPropagation()} // Impede que clicar aqui navegue para a série
      >
        <div className="flex gap-2">
          <Input 
            placeholder="Nº Cap (ex: 3)" 
            className="h-8 text-xs font-bold bg-zinc-900 border-none"
            value={chapterNum}
            onChange={(e) => setChapterNum(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickDownload(e as any);
            }}
          />
          <Button 
            size="sm" 
            className="h-8 w-10 p-0 text-primary bg-primary/20 hover:bg-primary hover:text-primary-foreground"
            onClick={handleQuickDownload}
            disabled={loading || !chapterNum.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
        </div>
        
        {driveLink && (
          <div className="flex flex-col gap-1.5 mt-2">
            <a 
              href={driveLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 py-1.5 rounded-md transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> Acessar no Drive
            </a>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] font-black uppercase text-zinc-300 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800"
              onClick={(e) => {
                e.stopPropagation();
                const cover = series.cover_url?.startsWith("//") ? `https:${series.cover_url}` : series.cover_url;
                const chapterFull = `${completedChapter?.chapter_number || ''} ${completedChapter?.chapter_title ? '- ' + completedChapter.chapter_title : ''}`.trim();
                const text = `serie: [${series.title}](${cover})\ncap: ${chapterFull}\n\nlink drive: ${driveLink}`;
                navigator.clipboard.writeText(text);
                toast.success("Mensagem copiada para o Discord!");
              }}
            >
              Copiar Discord
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
