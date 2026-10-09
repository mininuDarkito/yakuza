"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Users, Download, Loader2, CheckCircle2, Pencil, CalendarDays, ExternalLink, Copy, Send, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SeriesCardProps {
  series: any;
  groups?: any[];
  onUpdate?: () => void;
}

export function SeriesCard({ series, groups = [], onUpdate }: SeriesCardProps) {
  const router = useRouter();
  const [chapterNum, setChapterNum] = useState("");
  const [loading, setLoading] = useState(false);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  const [completedChapter, setCompletedChapter] = useState<any>(null);

  // Edit Name
  const [editOpen, setEditOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(series.title);
  const [updating, setUpdating] = useState(false);

  // Schedule
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>(series.schedule_days || []);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Groups
  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(series.grupo_ids || []);
  const [savingGroups, setSavingGroups] = useState(false);

  // Direct Discord sending
  const [sendingDiscord, setSendingDiscord] = useState(false);

  const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSaveSchedule = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/admin/mechacomic/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId: series.id, days: selectedDays })
      });
      if (res.ok) {
        toast.success(selectedDays.length > 0 ? `Agendamento salvo! (${selectedDays.map(d => DAY_LABELS[d]).join(', ')})` : 'Agendamento removido.');
        setScheduleOpen(false);
        if (onUpdate) onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar agendamento');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleSaveGroups = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSavingGroups(true);
    try {
      const res = await fetch('/api/admin/mechacomic/groups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId: series.id, grupoIds: selectedGroupIds })
      });
      if (res.ok) {
        toast.success('Grupos vinculados com sucesso!');
        setGroupOpen(false);
        if (onUpdate) onUpdate();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar grupos');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setSavingGroups(false);
    }
  };

  const handleSendToDiscordChannel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!driveLink) return;

    setSendingDiscord(true);
    const toastId = toast.loading("Enviando mensagem para o(s) canal(is) do Discord...");
    try {
      const cover = series.cover_url?.startsWith("//") ? `https:${series.cover_url}` : series.cover_url;
      const chapterFull = `${completedChapter?.chapter_number || ''} ${completedChapter?.chapter_title ? '- ' + completedChapter.chapter_title : ''}`.trim() || `Capítulo ${chapterNum}`;

      const res = await fetch('/api/admin/mechacomic/send-discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesId: series.id,
          seriesTitle: series.title,
          coverUrl: cover,
          chapterFullTitle: chapterFull,
          driveLink,
          groupIds: series.grupo_ids || []
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Mensagem enviada com sucesso para o canal do grupo!", { id: toastId });
      } else {
        toast.error(data.error || "Erro ao enviar para o Discord", { id: toastId });
      }
    } catch {
      toast.error("Erro de conexão ao enviar mensagem", { id: toastId });
    } finally {
      setSendingDiscord(false);
    }
  };

  const handleQuickDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!chapterNum.trim()) return;

    setLoading(true);
    setDriveLink(null);
    const toastId = toast.loading(`Buscando capítulo ${chapterNum}...`);

    try {
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

      const poll = setInterval(async () => {
        try {
          const resPoll = await fetch(`/api/admin/mechacomic/downloads?chapterId=${dataSearch.chapterId}`);
          if (!resPoll.ok) return;
          const downloadsArray = await resPoll.json();
          const dlStatus = downloadsArray[0];

          if (dlStatus) {
            if (dlStatus.status === "completed") {
              clearInterval(poll);
              toast.success("Download concluído com sucesso!", { id: toastId });
              setDriveLink(dlStatus.drive_link);
              setCompletedChapter(dlStatus.chapter);
              setLoading(false);
              setChapterNum("");
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

  const assignedGroups = groups.filter(g => (series.grupo_ids || []).includes(g.id));

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

        {/* Botões de ação no hover: Agendar + Vincular Grupos + Editar */}
        <div 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* --- Agendar Dias --- */}
          <Dialog open={scheduleOpen} onOpenChange={(open) => {
            if (open) setSelectedDays(series.schedule_days || []);
            setScheduleOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-lg" title="Agendar Dias">
                <CalendarDays className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Agendamento Auto-Sync</DialogTitle>
                <DialogDescription>
                  Selecione os dias da semana para conferir se lançou novo capítulo e sincronizar às 12h (BRT) / 00h (JST).
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Label>Dias da semana</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${
                        selectedDays.includes(idx)
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {series.last_auto_sync && (
                  <p className="text-[10px] text-zinc-500">
                    Último sync automático: {new Date(series.last_auto_sync).toLocaleString('pt-BR')}
                  </p>
                )}
                {selectedDays.length === 0 && (
                  <p className="text-[10px] text-zinc-600 italic">Nenhum dia selecionado = sem auto-sync.</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={savingSchedule}>Cancelar</Button>
                <Button onClick={handleSaveSchedule} disabled={savingSchedule}>
                  {savingSchedule && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* --- Vincular Grupos --- */}
          <Dialog open={groupOpen} onOpenChange={(open) => {
            if (open) setSelectedGroupIds(series.grupo_ids || []);
            setGroupOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-lg" title="Vincular Grupos">
                <Users className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Vincular Grupos à Série</DialogTitle>
                <DialogDescription>
                  Selecione um ou mais grupos para esta obra. Os capítulos poderão ser enviados diretamente para os canais do Discord desses grupos.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <Label>Grupos disponíveis</Label>
                {groups.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">Nenhum grupo cadastrado no sistema.</p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {groups.map((group) => {
                      const isSelected = selectedGroupIds.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-500/10 text-white'
                              : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-black uppercase">{group.nome}</p>
                            <p className="text-[10px] text-zinc-500">
                              Canal Discord: {group.channel_id ? `<#${group.channel_id}>` : 'Sem canal'}
                            </p>
                          </div>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                            isSelected ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {isSelected ? 'Selecionado' : 'Selecionar'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGroupOpen(false)} disabled={savingGroups}>Cancelar</Button>
                <Button onClick={handleSaveGroups} disabled={savingGroups}>
                  {savingGroups && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Grupos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* --- Editar nome --- */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-lg" title="Editar Nome">
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

        {/* Badges Flutuantes na Capa */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
          {series.schedule_days?.length > 0 && (
            <span className="flex items-center gap-1 bg-primary/20 border border-primary/40 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
              <CalendarDays className="w-2.5 h-2.5" /> Auto
            </span>
          )}
          {assignedGroups.length > 0 && (
            <span className="flex items-center gap-1 bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full backdrop-blur-sm">
              <Users className="w-2.5 h-2.5" /> {assignedGroups.length} grupo(s)
            </span>
          )}
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-lg line-clamp-2">{series.title}</CardTitle>
        <CardDescription className="text-xs truncate">{series.url}</CardDescription>
        
        {/* Grupos Vinculados */}
        {assignedGroups.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {assignedGroups.map((g) => (
              <span key={g.id} className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-300">
                {g.nome}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Sem grupo vinculado</p>
        )}

        {/* Calendário */}
        {series.schedule_days?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {series.schedule_days.map((day: number) => (
              <span key={day} className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] text-zinc-300">
                {DAY_LABELS[day]}
              </span>
            ))}
          </div>
        ) : null}
      </CardHeader>
      
      <CardContent className="p-4 pt-0 mt-auto flex justify-between text-muted-foreground text-sm">
        <div className="flex items-center gap-1">
          <BookOpen className="w-4 h-4" />
          <span>{series._count?.chapters || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{assignedGroups.length}</span>
        </div>
      </CardContent>

      {/* SEÇÃO DE DOWNLOAD RÁPIDO E AÇÕES DOS CAPÍTULOS BAIXADOS */}
      <div 
        className="mt-auto border-t border-white/10 p-3 bg-black/40 space-y-2"
        onClick={(e) => e.stopPropagation()}
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
            {/* BOTÃO 1: DRIVE */}
            <a 
              href={driveLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 py-1.5 rounded-md transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> DRIVE
            </a>

            {/* BOTÃO 2: DISCORD (COPIAR MODELO) */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px] font-black uppercase text-zinc-300 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 flex items-center justify-center gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                const cover = series.cover_url?.startsWith("//") ? `https:${series.cover_url}` : series.cover_url;
                const chapterFull = `${completedChapter?.chapter_number || ''} ${completedChapter?.chapter_title ? '- ' + completedChapter.chapter_title : ''}`.trim() || `Capítulo ${chapterNum}`;
                const text = `serie: [${series.title}](${cover || ''})\ncap: ${chapterFull}\n\nlink drive: ${driveLink}`;
                navigator.clipboard.writeText(text);
                toast.success("Modelo de mensagem do Discord copiado!");
              }}
            >
              <Copy className="h-3 w-3" /> DISCORD (COPIAR)
            </Button>

            {/* BOTÃO 3: ENVIAR DIRETO PRO CANAL DO GRUPO */}
            <Button
              size="sm"
              className="h-7 text-[10px] font-black uppercase text-indigo-300 bg-indigo-500/20 border border-indigo-500/40 hover:bg-indigo-500 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
              onClick={handleSendToDiscordChannel}
              disabled={sendingDiscord}
            >
              {sendingDiscord ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              ENVIAR PRO CANAL DO GRUPO
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
