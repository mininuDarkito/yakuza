"use client";

import { useState } from "react";
import { Download, Loader2, CalendarDays, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NewChapter {
  id: string;
  chapter_number: string | null;
  chapter_title: string | null;
  chapter_url: string;
  status: string | null;
  cost: string | null;
  series: {
    id: string;
    title: string;
    cover_url: string | null;
  };
  downloads?: { status: string; drive_link: string | null }[];
}

interface DailyReleasesPanelProps {
  chapters: NewChapter[];
  onRefresh: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  free: { label: "Free", color: "text-green-400 bg-green-500/10" },
  purchased: { label: "Comprado", color: "text-blue-400 bg-blue-500/10" },
  paid: { label: "Pago", color: "text-red-400 bg-red-500/10" },
  wait_free: { label: "Aguardar Free", color: "text-yellow-400 bg-yellow-500/10" },
};

function ChapterCard({ chapter, onRefresh }: { chapter: NewChapter; onRefresh: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const cover = chapter.series.cover_url?.startsWith("//")
    ? `https:${chapter.series.cover_url}`
    : chapter.series.cover_url;

  const latestDownload = chapter.downloads?.[chapter.downloads.length - 1];
  const statusInfo = STATUS_LABELS[chapter.status || ""] || null;

  const chapterFull = `${chapter.chapter_number || ""} ${chapter.chapter_title ? "- " + chapter.chapter_title : ""}`.trim();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/mechacomic/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterIds: [chapter.id], stitchMode: true }),
      });
      if (res.ok) {
        toast.success("Download iniciado!");
        onRefresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao iniciar download");
      }
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyDiscord = () => {
    const text = `Série: [${chapter.series.title}](${cover})\n\nCap: ${chapterFull}\n\nLink Drive: ${latestDownload?.drive_link}`;
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada para o Discord!");
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group">
      {/* Cover */}
      <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 shadow-lg">
        {cover ? (
          <img src={cover} alt={chapter.series.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">?</div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase text-zinc-500 truncate">{chapter.series.title}</p>
        <p className="text-sm font-bold text-zinc-100 truncate mt-0.5">{chapterFull || "Capítulo"}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {statusInfo && (
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}
          {chapter.cost && chapter.cost !== "0" && (
            <span className="text-[9px] font-black uppercase text-zinc-500 font-mono">{chapter.cost} pt</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {latestDownload?.status === "completed" && latestDownload.drive_link ? (
          <>
            <a
              href={latestDownload.drive_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-400 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Drive
            </a>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[9px] font-black uppercase border-zinc-700 text-zinc-400 hover:text-zinc-100"
              onClick={handleCopyDiscord}
            >
              Discord
            </Button>
          </>
        ) : latestDownload?.status === "pending" || latestDownload?.status === "processing" ? (
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            {latestDownload.status === "pending" ? "Na Fila" : "Processando"}
          </span>
        ) : (
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="h-7 px-3 text-[10px] font-black uppercase gap-1.5"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Baixar
          </Button>
        )}
      </div>
    </div>
  );
}

export function DailyReleasesPanel({ chapters, onRefresh }: DailyReleasesPanelProps) {
  if (chapters.length === 0) return null;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden shadow-lg shadow-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-primary/10 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest text-primary">
            Lançamentos de Hoje
          </span>
          <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            {chapters.length}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 uppercase font-bold">Sync automático · Meia-noite JST</p>
      </div>

      {/* Chapters list */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {chapters.map((chapter) => (
          <ChapterCard key={chapter.id} chapter={chapter} onRefresh={onRefresh} />
        ))}
      </div>
    </div>
  );
}
