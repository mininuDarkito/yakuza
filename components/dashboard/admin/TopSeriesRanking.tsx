"use client";

import { useState, useMemo, useEffect } from "react";
import { Award, BookOpen, Layers, DollarSign, ImageOff } from "lucide-react";

export interface GrupoDetalheRanking {
  nome: string;
  qtd: number;
  receita: number;
}

export interface SeriesRankingItem {
  produto_id?: string;
  nome: string;
  descricao?: string | null;
  imagem_url?: string | null;
  grupo_nome?: string | null;
  grupos?: GrupoDetalheRanking[];
  qtd: number;
  receita: number;
}

interface TopSeriesRankingProps {
  ranking: SeriesRankingItem[];
  mesNome?: string;
}

export function TopSeriesRanking({
  ranking = [],
  mesNome = "Mês Selecionado",
}: TopSeriesRankingProps) {
  // Guarda o id ou índice da série selecionada
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);

  // Apenas as top 5 séries conforme solicitado no layout do modelo
  const top5 = useMemo(() => {
    return ranking.slice(0, 5);
  }, [ranking]);

  // Série ativa: se o selecionado estiver no top 5, mantém; caso contrário, pega a #1
  const activeSeries = useMemo(() => {
    if (top5.length === 0) return null;
    const found = top5.find(
      (s) => (s.produto_id || s.nome) === selectedKey
    );
    return found || top5[0];
  }, [top5, selectedKey]);

  // Índice da série ativa (1 a 5)
  const activeIndex = useMemo(() => {
    if (!activeSeries || top5.length === 0) return 0;
    const idx = top5.findIndex(
      (s) => (s.produto_id || s.nome) === (activeSeries.produto_id || activeSeries.nome)
    );
    return idx >= 0 ? idx : 0;
  }, [top5, activeSeries]);

  // Verifica se há empate na quantidade máxima entre 2 ou mais grupos
  const isEmpateGrupos = useMemo(() => {
    if (!activeSeries?.grupos || activeSeries.grupos.length < 2) return false;
    return (
      activeSeries.grupos[0].qtd === activeSeries.grupos[1].qtd &&
      activeSeries.grupos[0].qtd > 0
    );
  }, [activeSeries]);

  // Reseta o estado de erro de imagem quando a série ativa muda
  useEffect(() => {
    setImgError(false);
  }, [activeSeries?.produto_id, activeSeries?.imagem_url]);

  const formatarDolar = (valor: number) => {
    return (
      "US$ " +
      valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const getRankBadgeColors = (index: number, isSelected: boolean) => {
    if (isSelected) {
      return "bg-primary text-primary-foreground border-primary shadow-xs";
    }
    switch (index) {
      case 0:
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case 1:
        return "bg-slate-400/10 text-slate-400 border-slate-400/30";
      case 2:
        return "bg-amber-700/10 text-amber-700 dark:text-amber-500 border-amber-700/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <section className="space-y-4">
      {/* SEÇÃO PRINCIPAL EM GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* COLUNA ESQUERDA: LISTA TOP 5 SÉRIES COM MAIOR VENDA */}
        <div className="lg:col-span-5 xl:col-span-4 p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between space-y-5 transition-colors">
          <div>
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground leading-tight">
                  Séries com Maior Venda
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">
                  {mesNome} · Top {top5.length}
                </p>
              </div>
            </div>

            {/* LISTA NUMERADA 1 A 5 */}
            {top5.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs font-bold text-muted-foreground uppercase italic">
                  Sem vendas registradas em {mesNome}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  Clique em outro mês no gráfico acima.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-4">
                {top5.map((item, index) => {
                  const isSelected =
                    activeSeries &&
                    (activeSeries.produto_id || activeSeries.nome) ===
                      (item.produto_id || item.nome);
                  const rankNum = index + 1;

                  return (
                    <button
                      key={item.produto_id || item.nome + index}
                      type="button"
                      onClick={() =>
                        setSelectedKey(item.produto_id || item.nome)
                      }
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                        isSelected
                          ? "bg-purple-500/10 border-purple-500 dark:bg-purple-950/30 dark:border-purple-400 shadow-xs ring-1 ring-purple-500/30"
                          : "bg-muted/20 border-border hover:border-primary/40 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* BADGE NÚMERO (1, 2, 3, 4, 5) */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-black italic font-mono text-sm border shrink-0 transition-colors ${getRankBadgeColors(
                            index,
                            Boolean(isSelected)
                          )}`}
                        >
                          {rankNum}
                        </div>

                        {/* NOME E GRUPO */}
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-black uppercase italic leading-tight truncate transition-colors ${
                              isSelected
                                ? "text-purple-600 dark:text-purple-300"
                                : "text-foreground group-hover:text-primary"
                            }`}
                            title={item.nome}
                          >
                            {item.nome}
                          </p>
                          <p
                            className={`text-[10px] font-medium truncate mt-0.5 ${
                              item.grupos &&
                              item.grupos.length > 1 &&
                              item.grupos[0].qtd === item.grupos[1].qtd
                                ? "text-purple-600 dark:text-purple-400 font-bold"
                                : "text-muted-foreground"
                            }`}
                            title={item.grupo_nome || "Geral"}
                          >
                            {item.grupo_nome || "Geral"}
                          </p>
                        </div>
                      </div>

                      {/* STATS RÁPIDOS */}
                      <div className="text-right shrink-0">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 italic font-mono">
                          {item.qtd} UN
                        </p>
                        <p className="text-[10px] font-bold text-muted-foreground font-mono">
                          {formatarDolar(item.receita)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {top5.length > 0 && (
            <p className="text-[10px] text-muted-foreground/70 text-center italic pt-2 border-t border-border">
              Clique em uma das obras para visualizar os detalhes
            </p>
          )}
        </div>

        {/* COLUNA DIREITA: DETALHES DA SÉRIE SELECIONADA (CAPA + NOME + SINOPSE + CARDS) */}
        <div className="lg:col-span-7 xl:col-span-8 p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between transition-colors">
          {!activeSeries ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-3">
              <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm font-bold text-muted-foreground uppercase italic">
                Nenhuma série selecionada
              </p>
              <p className="text-xs text-muted-foreground/60 max-w-sm">
                As vendas do mês de {mesNome} aparecerão aqui assim que houver
                lançamentos registrados.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between space-y-6">
              {/* CORPO: CAPA (ESQUERDA) + NOME E SINOPSE (DIREITA) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* [ CAPA ] */}
                <div className="md:col-span-4 lg:col-span-4 flex flex-col items-center">
                  <div className="relative aspect-[3/4] w-full max-w-[240px] md:max-w-none rounded-2xl overflow-hidden border border-border shadow-md bg-muted/30 group">
                    {activeSeries.imagem_url && !imgError ? (
                      <img
                        src={activeSeries.imagem_url}
                        alt={activeSeries.nome}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-muted/60 to-muted/20">
                        <ImageOff className="h-10 w-10 text-muted-foreground/40 mb-2" />
                        <span className="text-[11px] font-black uppercase italic tracking-tight text-muted-foreground">
                          {activeSeries.nome}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 mt-1 uppercase font-mono">
                          Sem Capa
                        </span>
                      </div>
                    )}

                    {/* BADGE DE RANKING SOBRE A CAPA */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-md border border-border text-xs font-black italic font-mono text-foreground shadow-xs">
                      #{activeIndex + 1}
                    </div>
                  </div>
                </div>

                {/* [ NOME + SINOPSE ] */}
                <div className="md:col-span-8 lg:col-span-8 flex flex-col justify-between space-y-4">
                  {/* [ NOME ] */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-purple-600 dark:text-purple-400 font-bold block">
                      Obra em Destaque · {mesNome}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-foreground leading-tight">
                      {activeSeries.nome}
                    </h2>
                  </div>

                  {/* [ SINOPSE ] */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2 flex-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground font-bold block">
                      Sinopse da Obra
                    </span>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic max-h-48 overflow-y-auto pr-1">
                      {activeSeries.descricao && activeSeries.descricao.trim()
                        ? activeSeries.descricao
                        : "Nenhuma sinopse cadastrada para esta obra no catálogo Yakuza."}
                    </p>
                  </div>
                </div>
              </div>

              {/* [ LINHA INFERIOR: N DE CAPS, NOME GRUPO, VALOR ] */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                {/* CARD 1: N DE CAPS */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Nº de Capítulos
                    </span>
                    <strong className="text-base font-black italic text-foreground font-mono truncate block">
                      {activeSeries.qtd} UN
                    </strong>
                  </div>
                </div>

                {/* CARD 2: NOME GRUPO / GRUPOS RESPONSÁVEIS */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                        {activeSeries.grupos && activeSeries.grupos.length > 1
                          ? "Grupos Responsáveis"
                          : "Grupo Responsável"}
                      </span>
                      {isEmpateGrupos && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase font-mono">
                          Empate
                        </span>
                      )}
                    </div>

                    {activeSeries.grupos && activeSeries.grupos.length > 1 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {activeSeries.grupos.map((g, idx) => {
                          const isTop = g.qtd === activeSeries.grupos![0].qtd;
                          return (
                            <div
                              key={idx}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black italic transition-colors ${
                                isTop
                                  ? "bg-purple-500/15 border-purple-500/40 text-purple-600 dark:text-purple-300"
                                  : "bg-muted/40 border-border text-foreground"
                              }`}
                              title={`${g.nome}: ${g.qtd} capítulos · ${formatarDolar(g.receita)}`}
                            >
                              <span>{g.nome}</span>
                              <span className="text-[10px] font-mono font-bold text-muted-foreground/90">
                                ({g.qtd} UN)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <strong
                        className="text-base font-black italic text-foreground truncate block mt-0.5"
                        title={activeSeries.grupo_nome || "Geral"}
                      >
                        {activeSeries.grupo_nome || "Geral"}
                      </strong>
                    )}
                  </div>
                </div>

                {/* CARD 3: VALOR */}
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/20 dark:border-emerald-800/40 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-[#8fd9b6] font-bold">
                      Faturamento Total
                    </span>
                    <strong className="text-base font-black italic text-emerald-600 dark:text-emerald-400 font-mono truncate block">
                      {formatarDolar(activeSeries.receita)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
