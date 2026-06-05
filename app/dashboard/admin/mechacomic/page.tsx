"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SeriesCard } from "@/components/dashboard/mechacomic/SeriesCard";
import { DailyReleasesPanel } from "@/components/dashboard/mechacomic/DailyReleasesPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Plus, Loader2, KeyRound, RefreshCw, Search, ExternalLink, User, Clock, Image } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function MechaComicDashboard() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<number[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState("");
  const [showErrorsOnly, setShowErrorsOnly] = useState(true);

  // Auth State
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ isValid: boolean, points: string, username?: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(false);

  // Daily releases
  const [dailyChapters, setDailyChapters] = useState<any[]>([]);
  const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toggleDayFilter = (day: number) => {
    setDayFilter((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const getScheduleOrder = (series: any) => {
    if (!series.schedule_days?.length) return 7;
    return Math.min(...series.schedule_days);
  };

  const filteredSeries = useMemo(() => {
    return [...seriesList]
      .filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
      .filter((s) =>
        dayFilter.length === 0 ||
        (s.schedule_days || []).some((day: number) => dayFilter.includes(day)),
      )
      .sort((a, b) => {
        const orderA = getScheduleOrder(a);
        const orderB = getScheduleOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
      });
  }, [seriesList, search, dayFilter]);

  const checkSession = async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch('/api/admin/mechacomic/account');
      if (res.ok) {
        const data = await res.json();
        setSessionInfo({
          isValid: data.isValid,
          points: data.points || '0',
          username: data.username || undefined,
        });
      } else {
        setSessionInfo({ isValid: false, points: '0' });
      }
    } catch (e) {
      console.error("Erro ao verificar sessão.");
      setSessionInfo({ isValid: false, points: '0' });
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchSeries = async () => {
    try {
      const res = await fetch('/api/admin/mechacomic/series');
      const data = await res.json();
      if (res.ok) {
        setSeriesList(Array.isArray(data) ? data : (data.series || []));
      }
    } catch (e) {
      toast.error("Erro ao carregar séries.");
    } finally {
      setFetching(false);
    }
  };

  const fetchDailyReleases = async () => {
    try {
      // Busca capítulos de séries cujo last_auto_sync foi hoje
      const res = await fetch('/api/admin/mechacomic/daily-releases');
      if (res.ok) {
        const data = await res.json();
        setDailyChapters(data.chapters || []);
      }
    } catch (e) {
      // Silencioso — não quebra a página
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      if (logFilter.trim()) params.set('search', logFilter.trim());
      if (showErrorsOnly) params.set('level', 'error');
      const res = await fetch(`/api/admin/mechacomic/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      } else {
        toast.error(data.error || 'Erro ao carregar logs.');
      }
    } catch (e) {
      toast.error('Erro ao carregar logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeries();
    checkSession();
    fetchDailyReleases();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [showErrorsOnly]);

  const handleAdd = async () => {
    if (!url) return;
    setLoading(true);
    const id = toast.loading("Analisando série (isso pode demorar um pouco)...");
    
    try {
      const res = await fetch('/api/admin/mechacomic/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Série adicionada! ${data.chaptersAdded} capítulos encontrados.`, { id });
        setUrl("");
        fetchSeries();
      } else {
        toast.error(data.error || "Erro ao adicionar série", { id });
      }
    } catch (e: any) {
      toast.error("Erro de conexão", { id });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return toast.error("Preencha email e senha.");
    setLoggingIn(true);
    const id = toast.loading("Iniciando Playwright em background para renovar sessão...");

    try {
      const res = await fetch('/api/admin/mechacomic/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Sessão renovada com sucesso!", { id });
        setAuthOpen(false);
        setEmail("");
        setPassword("");
        checkSession(); // Atualiza o status após login
      } else {
        toast.error(data.error || "Erro ao fazer login", { id });
      }
    } catch (e) {
      toast.error("Erro de conexão com o backend.", { id });
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Painel de lançamentos do dia */}
      <DailyReleasesPanel chapters={dailyChapters} onRefresh={fetchDailyReleases} />

      <div className="space-y-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter">Logs do MechaComic</h2>
            <p className="text-sm text-zinc-500">Veja erros e eventos relacionados ao motor MechaComic sem sair do painel.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              placeholder="Buscar logs..."
              className="min-w-55 bg-zinc-900"
            />
            <Button
              variant={showErrorsOnly ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowErrorsOnly((prev) => !prev)}
            >
              {showErrorsOnly ? 'Somente erros' : 'Mostrar todos'}
            </Button>
            <Button size="sm" onClick={fetchLogs}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900">
          <ScrollArea className="h-72 rounded-3xl p-4">
            {logsLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">Carregando logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-sm text-zinc-500">Nenhum log encontrado para os filtros selecionados.</div>
            ) : (
              <div className="space-y-3 text-xs text-zinc-200">
                {logs.map((log) => {
                  const details = log.details || {};
                  const isDownloadCompleted = log.action === 'download-completed' && details.series;
                  const profileIconUrl = details.user?.profileIcon && String(details.user.profileIcon).startsWith('http')
                    ? String(details.user.profileIcon)
                    : null;

                  return (
                    <div key={log.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-black uppercase text-zinc-300">{log.action}</span>
                        <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      {isDownloadCompleted ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300">
                                <User className="w-3.5 h-3.5" />
                                {log.users?.discord_username || details.user?.discordUsername || 'Usuário desconhecido'}
                              </div>
                              {details.mechaAccount?.username && (
                                <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-zinc-300">
                                  <Image className="w-3.5 h-3.5" />
                                  {details.mechaAccount.username}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Série</p>
                                  <p className="font-black text-sm text-zinc-100">{details.series?.title || '—'}</p>
                                </div>
                                {details.series?.thumbnail && (
                                  <img src={details.series.thumbnail} alt={details.series.title} className="h-14 w-14 rounded-xl object-cover" />
                                )}
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Capítulo</p>
                                  <p className="text-sm font-black text-zinc-100">{details.chapter?.fullTitle || '—'}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Pontos usados</p>
                                  <p className="text-sm font-black text-zinc-100">{details.chapter?.cost || '0'} pt</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Saldo atual</p>
                                <p className="text-sm font-black text-zinc-100">{details.mechaAccount?.currentPoints || '0'} pt</p>
                              </div>
                              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Baixado em</p>
                                <p className="text-sm font-black text-zinc-100">{new Date(details.downloadedAt || log.created_at).toLocaleString('pt-BR')}</p>
                              </div>
                            </div>

                            {details.driveLink && (
                              <a
                                href={details.driveLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-green-500 bg-green-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-green-300 hover:bg-green-500/20"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Abrir Link Drive
                              </a>
                            )}
                          </div>

                          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
                            <div className="flex items-center gap-2">
                              {profileIconUrl ? (
                                <img src={profileIconUrl} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-800 text-zinc-400">
                                  <User className="h-5 w-5" />
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Perfil de quem baixou</p>
                                <p className="font-black text-sm text-zinc-100">{log.users?.discord_username || details.user?.discordUsername || 'Desconhecido'}</p>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-[10px] text-zinc-400">
                              <p className="font-black uppercase tracking-[0.15em] text-zinc-300">Dados do download</p>
                              <p>Nome da série: {details.series?.title || '—'}</p>
                              <p>Nome do capítulo: {details.chapter?.fullTitle || '—'}</p>
                              <p>Pontos usados: {details.chapter?.cost || '0'} pt</p>
                              <p>Saldo atual: {details.mechaAccount?.currentPoints || '0'} pt</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 text-[10px] text-zinc-400 whitespace-pre-wrap wrap-break-word">
                            {JSON.stringify(details, null, 2)}
                          </div>
                          {log.users?.discord_username && (
                            <div className="mt-2 text-[10px] text-zinc-500">Usuário: {log.users.discord_username}</div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <Bot className="w-8 h-8 text-primary" />
            MechaComic Engine
          </h1>
          <p className="text-muted-foreground">Adicione e gerencie séries para extração automática.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {checkingAuth ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Verificando...
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-full shadow-inner">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sessionInfo?.isValid ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                <span className={`text-[10px] font-black uppercase ${sessionInfo?.isValid ? 'text-green-500' : 'text-red-500'}`}>
                  Sessão {sessionInfo?.isValid ? 'Válida' : 'Expirada'}
                </span>
              </div>
              {sessionInfo?.isValid && (
                <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Saldo:</span>
                  <span className="text-sm font-black text-primary font-mono">{sessionInfo.points} pt</span>
                  {sessionInfo.username && (
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      Conta: {sessionInfo.username}
                    </span>
                  )}
                </div>
              )}
              <Button variant="ghost" size="icon" className="w-5 h-5 ml-1 hover:bg-zinc-800" onClick={checkSession}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          )}

          <Dialog open={authOpen} onOpenChange={setAuthOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <KeyRound className="w-4 h-4" />
                Renovar Sessão
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renovar Sessão MechaComic</DialogTitle>
              <DialogDescription>
                O login será feito de forma invisível pelo servidor e não ficará salvo no banco de dados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="Seu email do MechaComic" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={loggingIn}
                />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input 
                  type="password" 
                  placeholder="Sua senha secreta" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  disabled={loggingIn}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAuthOpen(false)} disabled={loggingIn}>Cancelar</Button>
              <Button onClick={handleLogin} disabled={loggingIn || !email || !password}>
                {loggingIn && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Autenticar
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 p-4 bg-accent/50 rounded-lg border">
        <Input 
          placeholder="https://mechacomic.jp/books/..." 
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="bg-background"
        />
        <Button onClick={handleAdd} disabled={loading || !url}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Adicionar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar série pelo nome..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-accent/30 border-zinc-800"
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Filtro de dia</span>
        {DAY_LABELS.map((label, index) => (
          <Button
            key={label}
            size="sm"
            variant={dayFilter.includes(index) ? 'secondary' : 'outline'}
            onClick={() => toggleDayFilter(index)}
            className="h-8 px-3 text-[10px] font-black uppercase"
          >
            {label}
          </Button>
        ))}
        {dayFilter.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => setDayFilter([])} className="h-8 px-3 text-[10px] font-black uppercase">
            Limpar
          </Button>
        )}
      </div>

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredSeries.map((series) => (
            <SeriesCard key={series.id} series={series} onUpdate={fetchSeries} />
          ))}
          {seriesList.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhuma série monitorada. Adicione uma URL acima.
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Nenhuma série encontrada para os filtros aplicados.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
