"use client";

import { useState, useMemo } from "react";
import { Users, BookOpen, Calendar, ChevronDown, Layers } from "lucide-react";
import { TopSeriesRanking, SeriesRankingItem } from "./TopSeriesRanking";

export interface SeriesSaleRow {
  produto_id?: string;
  nome: string;
  descricao?: string | null;
  imagem_url?: string | null;
  ano: number;
  mes_index: number;
  user_id?: string;
  grupo_id?: string | null;
  grupo_nome?: string | null;
  qtd: number;
  receita: number;
}

interface MonthlySaleRow {
  ano: number;
  mes_index: number; // 1..12
  user_id?: string;
  grupo_id?: string | null;
  total: number;
}

interface VendedorOption {
  id: string;
  discord_username?: string | null;
  discord_avatar?: string | null;
}

interface GrupoOption {
  id: string;
  nome: string;
}

interface OverviewPanelProps {
  totais: {
    users: number;
    produtos: number;
  };
  monthlySales: MonthlySaleRow[];
  vendedores?: VendedorOption[];
  grupos?: GrupoOption[];
  seriesSales?: SeriesSaleRow[];
}

const NOMES_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export function OverviewPanel({
  totais,
  monthlySales,
  vendedores = [],
  grupos = [],
  seriesSales = [],
}: OverviewPanelProps) {
  const currentYear = new Date().getFullYear();
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("todos");
  const [grupoSelecionado, setGrupoSelecionado] = useState<string>("todos");

  // Filtra vendas por vendedor e por grupo antes de agrupar por ano
  const vendasFiltradas = useMemo(() => {
    if (!monthlySales || monthlySales.length === 0) return [];
    return monthlySales.filter((row) => {
      const matchUser = vendedorSelecionado === "todos" || row.user_id === vendedorSelecionado;
      const matchGrupo = grupoSelecionado === "todos" || row.grupo_id === grupoSelecionado;
      return matchUser && matchGrupo;
    });
  }, [monthlySales, vendedorSelecionado, grupoSelecionado]);

  // Processa vendas por ano
  const { dadosPorAno, anosDisponiveis } = useMemo(() => {
    const map: Record<number, { gmv: number; meses: (number | null)[] }> = {};

    if (!vendasFiltradas || vendasFiltradas.length === 0) {
      map[currentYear] = {
        gmv: 0,
        meses: Array(12).fill(null),
      };
    } else {
      vendasFiltradas.forEach((row) => {
        const ano = Number(row.ano);
        const mesIdx = Number(row.mes_index) - 1; // 0..11
        if (!map[ano]) {
          map[ano] = {
            gmv: 0,
            meses: Array(12).fill(null),
          };
        }
        const currentVal = map[ano].meses[mesIdx];
        map[ano].meses[mesIdx] = (currentVal !== null ? currentVal : 0) + (Number(row.total) || 0);
      });

      // Se o ano atual não tiver registros no banco, inclui ele zerado
      if (!map[currentYear]) {
        map[currentYear] = {
          gmv: 0,
          meses: Array(12).fill(null),
        };
      }

      // Calcula o GMV anual
      Object.keys(map).forEach((anoKey) => {
        const ano = Number(anoKey);
        const sum = map[ano].meses.reduce<number>((acc, val) => acc + (val || 0), 0);
        map[ano].gmv = sum;
      });
    }

    const anos = Object.keys(map)
      .map(Number)
      .sort((a, b) => b - a);

    return { dadosPorAno: map, anosDisponiveis: anos };
  }, [vendasFiltradas, currentYear]);

  const [anoSelecionado, setAnoSelecionado] = useState<number>(
    anosDisponiveis[0] || currentYear
  );

  const dadosAno = useMemo(() => {
    return (
      dadosPorAno[anoSelecionado] || {
        gmv: 0,
        meses: Array(12).fill(null),
      }
    );
  }, [dadosPorAno, anoSelecionado]);

  // Lista de meses que possuem valor (não nulo)
  const mesesComValor = useMemo(() => {
    const lista: { indice: number; valor: number }[] = [];
    dadosAno.meses.forEach((val, idx) => {
      if (val !== null) {
        lista.push({ indice: idx, valor: val });
      }
    });
    return lista;
  }, [dadosAno]);

  // Ranking dos meses em ordem decrescente de valor
  const rankingMeses = useMemo(() => {
    return [...mesesComValor].sort((a, b) => b.valor - a.valor);
  }, [mesesComValor]);

  const maiorValor = useMemo(() => {
    return rankingMeses[0]?.valor || 0;
  }, [rankingMeses]);

  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);

  // Mês ativo atual (padrão é o melhor mês ou mês 0)
  const mesAtivo = useMemo(() => {
    if (mesSelecionado !== null && dadosAno.meses[mesSelecionado] !== null) {
      return mesSelecionado;
    }
    if (rankingMeses.length > 0) {
      return rankingMeses[0].indice;
    }
    return 0;
  }, [mesSelecionado, rankingMeses, dadosAno]);

  // Formatadores
  const formatarNumero = (valor: number) => {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatarDolar = (valor: number) => {
    return "US$ " + formatarNumero(valor);
  };

  const formatarPorcentagem = (valor: number) => {
    return (
      valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }) + "%"
    );
  };

  // Métricas do Card GMV
  const melhorMesInfo = useMemo(() => {
    if (rankingMeses.length === 0 || rankingMeses[0].valor === 0) return "—";
    const melhor = rankingMeses[0];
    return `${MESES_CURTOS[melhor.indice]} · ${formatarDolar(melhor.valor)}`;
  }, [rankingMeses]);

  const mediaMensalInfo = useMemo(() => {
    if (mesesComValor.length === 0) return "—";
    const media = dadosAno.gmv / mesesComValor.length;
    return formatarDolar(media);
  }, [dadosAno.gmv, mesesComValor]);

  // Variação do Mês Ativo vs Anterior
  const variacaoAnterior = useMemo(() => {
    const valorAtual = dadosAno.meses[mesAtivo] || 0;
    const anteriorIdx = mesAtivo > 0 ? mesAtivo - 1 : null;
    const valorAnterior = anteriorIdx !== null ? dadosAno.meses[anteriorIdx] : null;

    if (valorAnterior === null || valorAnterior === 0) {
      return { texto: "Primeiro mês do ano", tipo: "neutro" as const };
    }

    const diff = ((valorAtual - valorAnterior) / valorAnterior) * 100;
    const nomeAnterior = MESES_CURTOS[anteriorIdx!].toLowerCase();

    if (diff >= 0) {
      return {
        texto: `▲ +${formatarPorcentagem(diff)} vs. ${nomeAnterior}`,
        tipo: "sobe" as const,
      };
    } else {
      return {
        texto: `▼ ${formatarPorcentagem(diff)} vs. ${nomeAnterior}`,
        tipo: "desce" as const,
      };
    }
  }, [dadosAno, mesAtivo]);

  // Posição no ranking do mês ativo
  const posicaoRanking = useMemo(() => {
    if (rankingMeses.length === 0) return "—";
    const pos = rankingMeses.findIndex((m) => m.indice === mesAtivo) + 1;
    if (pos === 0) return "—";
    return `${pos}º de ${rankingMeses.length}`;
  }, [rankingMeses, mesAtivo]);

  const valorMesAtivo = dadosAno.meses[mesAtivo] || 0;

  // Processa ranking de séries filtradas por ano, mês ativo, vendedor e grupo
  const rankingSeries = useMemo(() => {
    if (!seriesSales || seriesSales.length === 0) return [];

    const map = new Map<string, {
      produto_id: string;
      nome: string;
      descricao?: string | null;
      imagem_url?: string | null;
      qtd: number;
      receita: number;
      gruposMap: Map<string, { nome: string; qtd: number; receita: number }>;
    }>();

    const mesIndexBuscado = mesAtivo + 1; // 1..12

    seriesSales.forEach((row) => {
      const matchAno = Number(row.ano) === anoSelecionado;
      const matchMes = Number(row.mes_index) === mesIndexBuscado;
      const matchUser = vendedorSelecionado === "todos" || row.user_id === vendedorSelecionado;
      const matchGrupo = grupoSelecionado === "todos" || row.grupo_id === grupoSelecionado;

      if (matchAno && matchMes && matchUser && matchGrupo) {
        const key = row.produto_id || row.nome;
        const existing = map.get(key);
        const grupoNome = (row.grupo_nome || "").trim() || "Geral";
        const qtdRow = Number(row.qtd) || 0;
        const receitaRow = Number(row.receita) || 0;

        if (existing) {
          existing.qtd += qtdRow;
          existing.receita += receitaRow;
          if (row.descricao && !existing.descricao) existing.descricao = row.descricao;
          if (row.imagem_url && !existing.imagem_url) existing.imagem_url = row.imagem_url;
          
          const gInfo = existing.gruposMap.get(grupoNome) || { nome: grupoNome, qtd: 0, receita: 0 };
          gInfo.qtd += qtdRow;
          gInfo.receita += receitaRow;
          existing.gruposMap.set(grupoNome, gInfo);
        } else {
          const gMap = new Map<string, { nome: string; qtd: number; receita: number }>();
          gMap.set(grupoNome, { nome: grupoNome, qtd: qtdRow, receita: receitaRow });
          map.set(key, {
            produto_id: row.produto_id || key,
            nome: row.nome,
            descricao: row.descricao,
            imagem_url: row.imagem_url,
            qtd: qtdRow,
            receita: receitaRow,
            gruposMap: gMap,
          });
        }
      }
    });

    return Array.from(map.values())
      .map((item) => {
        const gruposList = Array.from(item.gruposMap.values()).sort(
          (a, b) => b.qtd - a.qtd || b.receita - a.receita
        );

        const maxQtd = gruposList[0]?.qtd || 0;
        // Grupos que empataram na quantidade mais alta
        const gruposTop = gruposList.filter((g) => g.qtd === maxQtd && g.qtd > 0);

        let grupoNomeFormatado = "Geral";
        if (gruposTop.length > 1) {
          // Mais de um grupo empatado com a mesma quantidade máxima
          grupoNomeFormatado = gruposTop.map((g) => g.nome).join(" & ");
        } else if (gruposList.length > 0) {
          grupoNomeFormatado = gruposList[0].nome;
        }

        return {
          produto_id: item.produto_id,
          nome: item.nome,
          descricao: item.descricao,
          imagem_url: item.imagem_url,
          qtd: item.qtd,
          receita: item.receita,
          grupo_nome: grupoNomeFormatado,
          grupos: gruposList,
        };
      })
      .sort((a, b) => {
        if (b.qtd !== a.qtd) return b.qtd - a.qtd;
        return b.receita - a.receita;
      });
  }, [seriesSales, anoSelecionado, mesAtivo, vendedorSelecionado, grupoSelecionado]);

  return (
    <div className="space-y-6">
      {/* SEÇÃO SUPERIOR: CONTROLES & FILTROS DE GRUPOS, VENDEDORES E ANO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-foreground">
            Visão Geral
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground italic">
            Indicadores de Desempenho e Faturamento do Ecossistema Yakuza
          </p>
        </div>

        {/* Filtros: Grupos, Vendedores e Ano */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Grupos */}
          <div className="relative inline-flex items-center">
            <Layers className="absolute left-3 w-4 h-4 text-purple-600 dark:text-purple-400 pointer-events-none" />
            <select
              value={grupoSelecionado}
              onChange={(e) => {
                setGrupoSelecionado(e.target.value);
                setMesSelecionado(null);
              }}
              className="appearance-none bg-card text-foreground font-bold text-xs pl-9 pr-9 py-2 rounded-xl border border-input hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all shadow-xs"
            >
              <option value="todos">Todos os Grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Filtro de Vendedor / Usuário */}
          <div className="relative inline-flex items-center">
            <Users className="absolute left-3 w-4 h-4 text-purple-600 dark:text-purple-400 pointer-events-none" />
            <select
              value={vendedorSelecionado}
              onChange={(e) => {
                setVendedorSelecionado(e.target.value);
                setMesSelecionado(null);
              }}
              className="appearance-none bg-card text-foreground font-bold text-xs pl-9 pr-9 py-2 rounded-xl border border-input hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all shadow-xs"
            >
              <option value="todos">Todos os Vendedores</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.discord_username || `Vendedor (${v.id.substring(0, 6)})`}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>

          {/* Filtro de Ano */}
          <div className="relative inline-flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-purple-600 dark:text-purple-400 pointer-events-none" />
            <select
              value={anoSelecionado}
              onChange={(e) => {
                setAnoSelecionado(Number(e.target.value));
                setMesSelecionado(null);
              }}
              className="appearance-none bg-card text-foreground font-bold text-xs pl-9 pr-9 py-2 rounded-xl border border-input hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer transition-all shadow-xs"
            >
              {anosDisponiveis.map((ano) => (
                <option key={ano} value={ano}>
                  Ano {ano}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* CARD GMV */}
        <div className="md:col-span-6 lg:col-span-6 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/20 dark:border-emerald-800/40 flex flex-col justify-between space-y-4 shadow-xs transition-colors">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs uppercase tracking-widest text-emerald-700 dark:text-[#8fd9b6] font-bold">
              Volume Bruto · GMV
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-800 dark:bg-[#173226] dark:text-[#8fd9b6] text-xs font-bold font-mono">
              {anoSelecionado}
            </span>
          </div>

          <div className="text-4xl sm:text-5xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            {formatarDolar(dadosAno.gmv)}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-500/20 dark:border-[#1d3a2e]">
            <div>
              <span className="block text-xs text-emerald-800/80 dark:text-[#8fb9a6] font-bold">Melhor mês</span>
              <span className="text-sm font-bold text-foreground font-mono">
                {melhorMesInfo}
              </span>
            </div>
            <div>
              <span className="block text-xs text-emerald-800/80 dark:text-[#8fb9a6] font-bold">Média mensal</span>
              <span className="text-sm font-bold text-foreground font-mono">
                {mediaMensalInfo}
              </span>
            </div>
          </div>
        </div>

        {/* CARD TOTAL DE VENDEDORES */}
        <div className="md:col-span-3 lg:col-span-3 p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 shadow-xs transition-colors">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-bold">
              TOTAL DE VENDEDORES
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="text-4xl font-black tracking-tight text-foreground font-mono">
            {totais.users}
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            GMV por seller:{" "}
            <strong className="text-foreground font-mono">
              {formatarDolar(totais.users > 0 ? dadosAno.gmv / totais.users : 0)}
            </strong>
          </div>
        </div>

        {/* CARD SÉRIES ATIVAS */}
        <div className="md:col-span-3 lg:col-span-3 p-6 rounded-2xl bg-card border border-border flex flex-col justify-between space-y-4 shadow-xs transition-colors">
          <div className="flex justify-between items-center">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Séries Ativas
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>

          <div className="text-4xl font-black tracking-tight text-foreground font-mono">
            {totais.produtos}
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            GMV por série:{" "}
            <strong className="text-foreground font-mono">
              {formatarDolar(totais.produtos > 0 ? dadosAno.gmv / totais.produtos : 0)}
            </strong>
          </div>
        </div>
      </section>

      {/* SEÇÃO PERFORMANCE MENSAL & ESTATÍSTICAS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* GRÁFICO DE BARRAS */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-card border border-border space-y-6 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-black uppercase italic text-foreground tracking-tight">
              Performance Mensal
            </h3>
            <span className="text-xs text-muted-foreground italic">
              Clique num mês para ver os detalhes
            </span>
          </div>

          {/* Wrapper responsivo para scroll horizontal em telas pequenas */}
          <div className="overflow-x-auto pt-4">
            <div className="grid grid-cols-12 gap-2 items-end min-w-[580px] h-64 border-b border-border pb-2">
              {dadosAno.meses.map((valor, idx) => {
                const isSelected = idx === mesAtivo;

                if (valor === null) {
                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground/60">—</span>
                      <div className="w-full h-6 rounded border border-dashed border-border" />
                      <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold">
                        {MESES_CURTOS[idx]}
                      </span>
                    </div>
                  );
                }

                const alturaPercent = maiorValor > 0 ? Math.max(4, (valor / maiorValor) * 100) : 4;

                return (
                  <div key={idx} className="flex flex-col items-center justify-end h-full gap-1.5 group">
                    <span
                      className={`text-[10px] font-mono font-semibold transition-colors ${isSelected
                        ? "text-emerald-600 dark:text-emerald-400 font-bold"
                        : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    >
                      {formatarNumero(valor)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMesSelecionado(idx)}
                      className={`w-full rounded-t-lg transition-all ${isSelected
                        ? "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
                        : "bg-muted-foreground/20 hover:bg-muted-foreground/35 dark:bg-[#26323a] dark:hover:bg-[#34444f]"
                        }`}
                      style={{ height: `${alturaPercent}%` }}
                      title={`${NOMES_MESES[idx]}: ${formatarDolar(valor)}`}
                    />
                    <span
                      className={`text-[10px] font-mono uppercase font-bold transition-colors ${isSelected
                        ? "text-foreground font-black"
                        : "text-muted-foreground group-hover:text-foreground"
                        }`}
                    >
                      {MESES_CURTOS[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUNA LATERAL (DETALHES DO MÊS + TOP 5 MESES) */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          {/* CARD MÊS SELECIONADO */}
          <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30 dark:bg-[#16132a] dark:border-[#2f2756] space-y-4 shadow-xs transition-colors">
            <span className="font-mono text-xs uppercase tracking-widest text-purple-700 dark:text-[#b9a8ff] font-bold">
              Mês Selecionado
            </span>
            <div className="space-y-1">
              <h4 className="text-xl font-black uppercase italic text-foreground">
                {NOMES_MESES[mesAtivo]} {anoSelecionado}
              </h4>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatarDolar(valorMesAtivo)}
              </div>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-purple-500/20 dark:border-[#2f2756] text-xs">
              <div className="flex justify-between items-center">
                <span className="text-purple-900/70 dark:text-[#b0a8d4]">Participação no ano</span>
                <strong className="text-foreground font-mono">
                  {dadosAno.gmv > 0
                    ? `${formatarPorcentagem((valorMesAtivo / dadosAno.gmv) * 100)} de ${formatarDolar(dadosAno.gmv)}`
                    : "0%"}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-900/70 dark:text-[#b0a8d4]">Vs. mês anterior</span>
                <strong
                  className={`font-mono ${variacaoAnterior.tipo === "sobe"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : variacaoAnterior.tipo === "desce"
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-muted-foreground"
                    }`}
                >
                  {variacaoAnterior.texto}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-purple-900/70 dark:text-[#b0a8d4]">Posição no ranking</span>
                <strong className="text-foreground font-mono">
                  {posicaoRanking}
                </strong>
              </div>
            </div>
          </div>

          {/* CARD TOP 5 MESES */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4 shadow-xs transition-colors">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-bold">
              Top 5 Meses
            </span>

            {rankingMeses.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Sem registros neste ano.</p>
            ) : (
              <ol className="space-y-3">
                {rankingMeses.slice(0, 5).map((mes, idx) => {
                  const percent = maiorValor > 0 ? (mes.valor / maiorValor) * 100 : 0;
                  const rankNum = String(idx + 1).padStart(2, "0");

                  return (
                    <li key={mes.indice} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground font-bold">{rankNum}</span>
                          <strong className="text-foreground font-bold">{NOMES_MESES[mes.indice]}</strong>
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {formatarDolar(mes.valor)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </section>

      {/* SEÇÃO SÉRIES COM MAIOR VENDA */}
      <TopSeriesRanking
        ranking={rankingSeries}
        mesNome={`${NOMES_MESES[mesAtivo]} ${anoSelecionado}`}
      />
    </div>
  );
}
