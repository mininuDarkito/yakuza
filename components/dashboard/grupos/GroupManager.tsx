"use client"

import { useState, useMemo, useEffect } from "react"
import { ChevronDown, ChevronUp, User, DollarSign, Loader2, Search, Plus, Trash2, Hash, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface Transacao {
  id: string
  data: Date
  quantidade: number
  valorUnitario: number
}

interface Produto {
  id: string
  nome: string
  nomeAlternativo?: string
  imagemUrl?: string
  plataforma?: string
  transacoes: Transacao[]
}

interface Vendedor {
  id: string
  nome: string
  contato: string
  chavePix: string
  statusRecebimento: boolean
  produtos: Produto[]
}

interface Grupo {
  id: string
  nome: string
  statusPagamento: boolean
  vendedores: Vendedor[]
  dataCriacao: Date
  channel_id?: string
  channelNome?: string
}

interface DiscordCanal {
  id: string
  nome: string
}

// ============================================================================
// MOCK DATA (Fallback se API falhar)
// ============================================================================

const MOCK_GRUPOS: Grupo[] = []

// ============================================================================
// COMPONENTES
// ============================================================================

interface VendedorDetailsProps {
  vendedor: Vendedor
  isExpanded: boolean
  onToggle: () => void
}

function VendedorDetails({ vendedor, isExpanded, onToggle }: VendedorDetailsProps) {
  return (
    <div className="border rounded-lg">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground">{vendedor.nome}</span>
          <Badge variant="outline" className="ml-2">
            {vendedor.statusRecebimento ? "✓ Recebido" : "Pendente"}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Contato</p>
              <p className="font-medium text-foreground">{vendedor.contato}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chave PIX</p>
              <p className="font-mono text-sm text-foreground break-all">
                {vendedor.chavePix}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ProdutoRowProps {
  produto: Produto
  mesAtual: string
}

function SerieCard({ produto }: { produto: Produto }) {
  return (
    <div className="flex gap-4 p-3 bg-linear-to-r from-primary/10 to-primary/20 rounded-lg border border-border">
      <div className="shrink-0">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="w-16 h-24 object-cover rounded border border-border"
          />
        ) : (
          <div className="w-16 h-24 bg-muted rounded border border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div>
          <p className="font-bold text-foreground text-sm">{produto.nome}</p>
          {produto.nomeAlternativo && (
            <p className="text-xs text-muted-foreground mt-1">{produto.nomeAlternativo}</p>
          )}
        </div>
        {produto.plataforma && (
          <Badge variant="outline" className="w-fit text-xs">
            {produto.plataforma}
          </Badge>
        )}
      </div>
    </div>
  )
}

function ProdutoRow({ produto, mesAtual }: ProdutoRowProps) {
  const transacoesFiltradas = produto.transacoes.filter((t) => {
    const mesTransacao = t.data.toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
    })
    return mesTransacao === mesAtual
  })

  if (transacoesFiltradas.length === 0) return null

  const quantidades = transacoesFiltradas.map((t) => t.quantidade)
  const totalArrecadado = transacoesFiltradas.reduce(
    (sum, t) => sum + t.valorUnitario,
    0
  )

  return (
    <div className="space-y-2">
      <SerieCard produto={produto} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-primary/10 rounded border border-border">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            {transacoesFiltradas.length} venda{transacoesFiltradas.length !== 1 ? "s" : ""} • Quantidades: {quantidades.map((q) => `[${q}]`).join(" ")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary text-lg">
            R$ {totalArrecadado.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>
    </div>
  )
}

interface VendedorSectionProps {
  vendedor: Vendedor
  grupoStatusPagamento: boolean
  mesAtual: string
  onStatusRecebimentoChange: (vendedorId: string, novoStatus: boolean) => void
  expandedVendedor: string | null
  onToggleVendedor: (vendedorId: string) => void
}

function VendedorSection({
  vendedor,
  grupoStatusPagamento,
  mesAtual,
  onStatusRecebimentoChange,
  expandedVendedor,
  onToggleVendedor,
}: VendedorSectionProps) {
  const [searchSerie, setSearchSerie] = useState<string>("")
  const [filterPlataforma, setFilterPlataforma] = useState<string>("")

  const isExpanded = expandedVendedor === vendedor.id
  const temProdutos = vendedor.produtos.some((p) =>
    p.transacoes.some((t) => {
      const mesTransacao = t.data.toLocaleString("pt-BR", {
        year: "numeric",
        month: "2-digit",
      })
      return mesTransacao === mesAtual
    })
  )

  const produtosFiltrados = vendedor.produtos.filter((p) => {
    const temNoMes = p.transacoes.some((t) => {
      const mesTransacao = t.data.toLocaleString("pt-BR", {
        year: "numeric",
        month: "2-digit",
      })
      return mesTransacao === mesAtual
    })

    if (!temNoMes) return false

    const searchLower = searchSerie.toLowerCase()
    const matchSerie =
      p.nome.toLowerCase().includes(searchLower) ||
      (p.nomeAlternativo && p.nomeAlternativo.toLowerCase().includes(searchLower))

    const matchPlataforma =
      !filterPlataforma || (p.plataforma && p.plataforma.toLowerCase() === filterPlataforma.toLowerCase())

    return matchSerie && matchPlataforma
  })

  const plataformas = Array.from(
    new Set(
      vendedor.produtos
        .filter((p) => p.plataforma)
        .map((p) => p.plataforma)
        .filter(Boolean)
    )
  ).sort()

  if (!temProdutos) return null

  return (
    <div className="border rounded-lg overflow-hidden">
      <VendedorDetails
        vendedor={vendedor}
        isExpanded={isExpanded}
        onToggle={() => onToggleVendedor(vendedor.id)}
      />

      {isExpanded && (
        <div className="bg-card p-4 space-y-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg">
            <div className="flex flex-col gap-2">
              <label htmlFor={`search-serie-${vendedor.id}`} className="text-sm font-medium text-foreground">
                Pesquisar Série:
              </label>
              <input
                id={`search-serie-${vendedor.id}`}
                type="text"
                placeholder="Nome ou nome alternativo..."
                value={searchSerie}
                onChange={(e) => setSearchSerie(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`filter-plataforma-${vendedor.id}`} className="text-sm font-medium text-foreground">
                Plataforma:
              </label>
              <select
                id={`filter-plataforma-${vendedor.id}`}
                value={filterPlataforma}
                onChange={(e) => setFilterPlataforma(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Todas as plataformas</option>
                {plataformas.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {produtosFiltrados.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma série encontrada com os filtros aplicados</p>
            ) : (
              produtosFiltrados.map((produto) => (
                <ProdutoRow key={produto.id} produto={produto} mesAtual={mesAtual} />
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t space-y-3">
            <p className="font-semibold text-foreground">Acerto de Contas</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox id={`grupo-pagou-${vendedor.id}`} checked={grupoStatusPagamento} disabled />
                <label
                  htmlFor={`grupo-pagou-${vendedor.id}`}
                  className="text-sm text-foreground cursor-pointer"
                >
                  Grupo Pagou
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`vendedor-recebeu-${vendedor.id}`}
                  checked={vendedor.statusRecebimento}
                  disabled={!grupoStatusPagamento}
                  onCheckedChange={(checked) => {
                    if (grupoStatusPagamento) {
                      onStatusRecebimentoChange(vendedor.id, checked as boolean)
                    }
                  }}
                />
                <label
                  htmlFor={`vendedor-recebeu-${vendedor.id}`}
                  className={`text-sm cursor-pointer ${
                    !grupoStatusPagamento ? "text-muted-foreground" : "text-foreground"
                  }`}
                >
                  Vendedor Recebeu {!grupoStatusPagamento && "(grupo precisa pagar primeiro)"}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface GrupoCardProps {
  grupo: Grupo
  isExpanded: boolean
  onToggle: () => void
  onGrupoPagamentoChange: (grupoId: string, novoStatus: boolean) => void
  onVendedorRecebimentoChange: (grupoId: string, vendedorId: string, novoStatus: boolean) => void
  expandedVendedor: string | null
  onToggleVendedor: (vendedorId: string) => void
  mesAtual: string
  onDelete: (grupoId: string) => void
}

function GrupoCard({
  grupo,
  isExpanded,
  onToggle,
  onGrupoPagamentoChange,
  onVendedorRecebimentoChange,
  expandedVendedor,
  onToggleVendedor,
  mesAtual,
  onDelete,
}: GrupoCardProps) {
  const totalProdutos = grupo.vendedores.reduce((sum, v) => sum + v.produtos.length, 0)
  const totalVendedores = grupo.vendedores.length

  return (
    <div className={`transition-all duration-500 ease-out overflow-hidden ${
      isExpanded
        ? "col-span-1 md:col-span-2 lg:col-span-4 max-h-[85vh]"
        : "col-span-1 max-h-48"
    }`}>
      <Card className={`overflow-hidden transition-all duration-500 ${
        grupo.statusPagamento
          ? "bg-linear-to-r from-success/40 to-success/20"
          : "bg-linear-to-r from-destructive/35 to-destructive/25"
      }`}>
        <div className="flex items-center justify-between p-6">
          <button
            type="button"
            onClick={onToggle}
            className="flex-1 text-left hover:bg-muted/20 transition-colors -m-2 p-2 rounded-md"
          >
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-foreground">{grupo.nome}</h3>
              <Badge variant={grupo.statusPagamento ? "default" : "secondary"}>
                {grupo.statusPagamento ? "✓ Pago" : "Pendente"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {totalVendedores} vendedor{totalVendedores !== 1 ? "es" : ""} • {totalProdutos} produtos
            </p>
            {grupo.channelNome && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {grupo.channelNome}
              </p>
            )}
          </button>
          <div className="flex items-center gap-2 pl-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(grupo.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-muted/20 transition-colors"
              aria-label={isExpanded ? "Recolher grupo" : "Expandir grupo"}
            >
              {isExpanded ? (
                <ChevronUp className="w-6 h-6 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-6 h-6 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <CardContent className={`border-t p-6 space-y-6 overflow-y-auto max-h-[60vh] ${
            grupo.statusPagamento
              ? "bg-success/30"
              : "bg-destructive/25"
          }`}>
            <div className="bg-card p-4 rounded-lg border border-border space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`grupo-pagamento-${grupo.id}`}
                  checked={grupo.statusPagamento}
                  onCheckedChange={(checked) =>
                    onGrupoPagamentoChange(grupo.id, checked as boolean)
                  }
                />
                <label
                  htmlFor={`grupo-pagamento-${grupo.id}`}
                  className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  Grupo Pagou
                </label>
              </div>
              {grupo.channelNome && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Canal vinculado: {grupo.channelNome}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Vendedores</h4>
              {grupo.vendedores.map((vendedor) => (
                <VendedorSection
                  key={vendedor.id}
                  vendedor={vendedor}
                  grupoStatusPagamento={grupo.statusPagamento}
                  mesAtual={mesAtual}
                  onStatusRecebimentoChange={(vendedorId, novoStatus) =>
                    onVendedorRecebimentoChange(grupo.id, vendedorId, novoStatus)
                  }
                  expandedVendedor={expandedVendedor}
                  onToggleVendedor={onToggleVendedor}
                />
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function GroupManager() {
  const [grupos, setGrupos] = useState<Grupo[]>(MOCK_GRUPOS)
  const [expandedGrupo, setExpandedGrupo] = useState<string | null>(null)
  const [expandedVendedor, setExpandedVendedor] = useState<string | null>(null)
  const [mesAtual, setMesAtual] = useState(
    new Date().toLocaleString("pt-BR", { year: "numeric", month: "2-digit" })
  )
  const [searchGrupo, setSearchGrupo] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [novoGrupoNome, setNovoGrupoNome] = useState("")
  const [novoGrupoChannelId, setNovoGrupoChannelId] = useState("")
  const [grupoDelecao, setGrupoDelecao] = useState<string | null>(null)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [canais, setCanais] = useState<DiscordCanal[]>([])
  const [loadingCanais, setLoadingCanais] = useState(false)

  const fetchDiscordChannels = async () => {
    setLoadingCanais(true)
    try {
      const response = await fetch("/api/discord/canais")
      if (!response.ok) {
        throw new Error("Erro ao buscar canais")
      }

      const data = await response.json()
      if (Array.isArray(data)) {
        setCanais(data)
      } else {
        setCanais([])
      }
    } catch (err) {
      console.error("Erro ao sincronizar canais:", err)
      toast.error("Erro ao sincronizar com o Discord")
    } finally {
      setLoadingCanais(false)
    }
  }

  useEffect(() => {
    if (showCreateModal) {
      fetchDiscordChannels()
    }
  }, [showCreateModal])

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/admin/grupos?mes=${encodeURIComponent(mesAtual)}`)

        if (!response.ok) {
          throw new Error("Erro ao carregar grupos")
        }

        const data = await response.json()

        if (data.success && data.grupos) {
          const gruposFormatados = data.grupos.map((grupo: any) => ({
            ...grupo,
            dataCriacao: new Date(grupo.dataCriacao),
            channel_id: grupo.channel_id || undefined,
            channelNome: grupo.channelNome || grupo.channel_nome || undefined,
            vendedores: grupo.vendedores.map((vendedor: any) => ({
              ...vendedor,
              produtos: vendedor.produtos.map((produto: any) => ({
                ...produto,
                nomeAlternativo: produto.nomeAlternativo && produto.nomeAlternativo.trim() ? produto.nomeAlternativo : undefined,
                imagemUrl: produto.imagemUrl && produto.imagemUrl.trim() ? produto.imagemUrl : undefined,
                plataforma: produto.plataforma && produto.plataforma.trim() ? produto.plataforma : undefined,
                transacoes: produto.transacoes.map((t: any) => ({
                  ...t,
                  data: typeof t.data === "string" ? new Date(t.data) : t.data,
                })),
              })),
            })),
          }))

          setGrupos(gruposFormatados)
        }
      } catch (err) {
        console.error("Erro ao carregar grupos:", err)
        setError("Erro ao carregar grupos da API")
      } finally {
        setLoading(false)
      }
    }

    fetchGrupos()
  }, [mesAtual])

  const handleGrupoPagamentoChange = async (grupoId: string, novoStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/grupos/${grupoId}/pagamento`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusPagamento: novoStatus, mes: mesAtual }),
      })

      if (!response.ok) {
        throw new Error("Erro ao atualizar status de pagamento")
      }

      setGrupos((prev) =>
        prev.map((g) =>
          g.id === grupoId ? { ...g, statusPagamento: novoStatus } : g
        )
      )

      toast.success("Status de pagamento atualizado")
    } catch (err) {
      console.error("Erro:", err)
      toast.error("Erro ao atualizar status de pagamento")
    }
  }

  const handleVendedorRecebimentoChange = async (
    grupoId: string,
    vendedorId: string,
    novoStatus: boolean
  ) => {
    try {
      const response = await fetch(
        `/api/admin/grupos/${grupoId}/vendedor/${vendedorId}/recebimento`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusRecebimento: novoStatus, mes: mesAtual }),
        }
      )

      if (!response.ok) {
        throw new Error("Erro ao atualizar status de recebimento")
      }

      setGrupos((prev) =>
        prev.map((g) =>
          g.id === grupoId
            ? {
                ...g,
                vendedores: g.vendedores.map((v) =>
                  v.id === vendedorId ? { ...v, statusRecebimento: novoStatus } : v
                ),
              }
            : g
        )
      )

      toast.success("Status de recebimento atualizado")
    } catch (err) {
      console.error("Erro:", err)
      toast.error("Erro ao atualizar status de recebimento")
    }
  }

  const handleCreateGrupo = async () => {
    if (!novoGrupoNome.trim()) {
      toast.error("Digite um nome para o grupo")
      return
    }

    if (!novoGrupoChannelId) {
      toast.error("Selecione um canal do Discord")
      return
    }

    const canalSelecionado = canais.find((canal) => canal.id === novoGrupoChannelId)

    try {
      setLoadingCreate(true)
      const response = await fetch("/api/admin/grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoGrupoNome, channel_id: novoGrupoChannelId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar grupo")
      }

      if (data.success) {
        const novoGrupo: Grupo = {
          id: data.grupo.id,
          nome: data.grupo.nome,
          statusPagamento: false,
          vendedores: [],
          dataCriacao: new Date(data.grupo.dataCriacao),
          channel_id: data.grupo.channel_id || novoGrupoChannelId,
          channelNome: canalSelecionado?.nome,
        }
        setGrupos((prev) => [novoGrupo, ...prev])
        setShowCreateModal(false)
        setNovoGrupoNome("")
        setNovoGrupoChannelId("")
        toast.success("Grupo criado com sucesso")
      }
    } catch (err) {
      console.error("Erro:", err)
      toast.error(err instanceof Error ? err.message : "Erro ao criar grupo")
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleDeleteGrupo = async (grupoId: string) => {
    try {
      const response = await fetch(`/api/admin/grupos/${grupoId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao deletar grupo")
      }

      setGrupos((prev) => prev.filter((g) => g.id !== grupoId))
      setGrupoDelecao(null)
      toast.success("Grupo deletado com sucesso")
    } catch (err) {
      console.error("Erro:", err)
      toast.error("Erro ao deletar grupo")
    }
  }

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>()
    grupos.forEach((grupo) => {
      grupo.vendedores.forEach((vendedor) => {
        vendedor.produtos.forEach((produto) => {
          produto.transacoes.forEach((transacao) => {
            const mes = transacao.data.toLocaleString("pt-BR", {
              year: "numeric",
              month: "2-digit",
            })
            meses.add(mes)
          })
        })
      })
    })
    return Array.from(meses).sort().reverse()
  }, [grupos])

  const totalAReceber = useMemo(() => {
    return grupos.reduce((total, grupo) => {
      const valorGrupo = grupo.vendedores.reduce((sum, vendedor) => {
        const valorVendedor = vendedor.produtos.reduce((prodSum, produto) => {
          return prodSum + produto.transacoes.reduce((transSum, transacao) => {
            const mesTrans = transacao.data.toLocaleString("pt-BR", {
              year: "numeric",
              month: "2-digit",
            })
            if (mesTrans === mesAtual) {
              return transSum + transacao.valorUnitario
            }
            return transSum
          }, 0)
        }, 0)
        return sum + valorVendedor
      }, 0)
      return total + valorGrupo
    }, 0)
  }, [grupos, mesAtual])

  const gruposFiltrados = useMemo(() => {
    return grupos.filter((grupo) =>
      grupo.nome.toLowerCase().includes(searchGrupo.toLowerCase())
    )
  }, [grupos, searchGrupo])

  const totalAReceberFiltrado = useMemo(() => {
    return gruposFiltrados.reduce((total, grupo) => {
      const valorGrupo = grupo.vendedores.reduce((sum, vendedor) => {
        const valorVendedor = vendedor.produtos.reduce((prodSum, produto) => {
          return prodSum + produto.transacoes.reduce((transSum, transacao) => {
            const mesTrans = transacao.data.toLocaleString("pt-BR", {
              year: "numeric",
              month: "2-digit",
            })
            if (mesTrans === mesAtual) {
              return transSum + transacao.valorUnitario
            }
            return transSum
          }, 0)
        }, 0)
        return sum + valorVendedor
      }, 0)
      return total + valorGrupo
    }, 0)
  }, [gruposFiltrados, mesAtual])

  const totalPendente = useMemo(() => {
    return gruposFiltrados.reduce((total, grupo) => {
      if (!grupo.statusPagamento) return total

      const valorPendente = grupo.vendedores.reduce((sum, vendedor) => {
        if (vendedor.statusRecebimento) return sum

        const valorVendedor = vendedor.produtos.reduce((prodSum, produto) => {
          return prodSum + produto.transacoes.reduce((transSum, transacao) => {
            const mesTrans = transacao.data.toLocaleString("pt-BR", {
              year: "numeric",
              month: "2-digit",
            })
            if (mesTrans === mesAtual) {
              return transSum + transacao.valorUnitario
            }
            return transSum
          }, 0)
        }, 0)
        return sum + valorVendedor
      }, 0)
      return total + valorPendente
    }, 0)
  }, [gruposFiltrados, mesAtual])

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Gerenciador de Grupos</h1>
          <p className="text-muted-foreground">
            Gerencie grupos, vendedores e acompanhe as vendas com filtro por mês
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 h-fit"
        >
          <Plus className="w-4 h-4" />
          Novo Grupo
        </Button>
      </div>

      {loading && (
        <Card className="p-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando grupos...</p>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <p className="text-destructive font-medium">{error}</p>
          <p className="text-destructive/80 text-sm mt-1">
            Certifique-se de que executou a migração SQL: <code className="bg-destructive/20 px-2 py-1 rounded">002-add-payment-status.sql</code>
          </p>
        </Card>
      )}

      {!loading && grupos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="search-grupo" className="font-medium text-foreground">
                Pesquisar Grupo:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="search-grupo"
                  type="text"
                  placeholder="Digite o nome do grupo..."
                  value={searchGrupo}
                  onChange={(e) => setSearchGrupo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-border rounded-md bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <label htmlFor="mes-select" className="font-medium text-foreground">
                Selecione o mês:
              </label>
              <select
                id="mes-select"
                value={mesAtual}
                onChange={(e) => setMesAtual(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {mesesDisponiveis.map((mes) => (
                  <option key={mes} value={mes}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && grupos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border bg-linear-to-br from-primary/10 to-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-foreground">Total a Receber</CardTitle>
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">
                R$ {totalAReceber.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Todos os grupos</p>
            </CardContent>
          </Card>

          <Card className={`border-border ${searchGrupo ? "bg-linear-to-br from-secondary/10 to-secondary/20" : "bg-linear-to-br from-muted/10 to-muted/20"}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-foreground">Com Filtro</CardTitle>
                <DollarSign className={`w-5 h-5 ${searchGrupo ? "text-secondary" : "text-muted-foreground"}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${searchGrupo ? "text-secondary" : "text-muted-foreground"}`}>
                R$ {totalAReceberFiltrado.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchGrupo ? `Filtro: "${searchGrupo}"` : "Nenhum filtro ativo"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-linear-to-br from-accent/10 to-accent/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-pr">Pendente</CardTitle>
                <DollarSign className="w-5 h-5 " />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold ">
                R$ {totalPendente.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Grupos pagos, não recebidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max">
        {grupos.length === 0 && !loading ? (
          <Card className="p-8 text-center col-span-1 md:col-span-2 lg:col-span-4">
            <p className="text-muted-foreground text-lg">Nenhum grupo encontrado</p>
          </Card>
        ) : grupos.filter((grupo) =>
            grupo.nome.toLowerCase().includes(searchGrupo.toLowerCase())
          ).length === 0 ? (
          <Card className="p-8 text-center col-span-1 md:col-span-2 lg:col-span-4">
            <p className="text-muted-foreground text-lg">Nenhum grupo encontrado com o termo "{searchGrupo}"</p>
          </Card>
        ) : (
          grupos
            .filter((grupo) =>
              grupo.nome.toLowerCase().includes(searchGrupo.toLowerCase())
            )
            .map((grupo) => (
              <GrupoCard
                key={grupo.id}
                grupo={grupo}
                isExpanded={expandedGrupo === grupo.id}
                onToggle={() =>
                  setExpandedGrupo(expandedGrupo === grupo.id ? null : grupo.id)
                }
                onGrupoPagamentoChange={handleGrupoPagamentoChange}
                onVendedorRecebimentoChange={handleVendedorRecebimentoChange}
                expandedVendedor={expandedVendedor}
                onToggleVendedor={(vendedorId) =>
                  setExpandedVendedor(expandedVendedor === vendedorId ? null : vendedorId)
                }
                mesAtual={mesAtual}
                onDelete={setGrupoDelecao}
              />
            ))
        )}
      </div>

      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) {
            setNovoGrupoNome("")
            setNovoGrupoChannelId("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
            <DialogDescription>
              Digite o nome do grupo e selecione o canal do Discord que será vinculado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input
              type="text"
              placeholder="Nome do grupo..."
              value={novoGrupoNome}
              onChange={(e) => setNovoGrupoNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novoGrupoChannelId) {
                  handleCreateGrupo()
                }
              }}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-foreground">
                  Vincular ao canal do Discord
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={fetchDiscordChannels}
                  disabled={loadingCanais}
                  className="h-8 text-xs"
                >
                  {loadingCanais ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                      Sincronizar
                    </>
                  )}
                </Button>
              </div>

              <Select value={novoGrupoChannelId} onValueChange={setNovoGrupoChannelId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingCanais ? "Buscando canais..." : "Selecione o canal de destino"} />
                </SelectTrigger>
                <SelectContent>
                  {canais.length > 0 ? (
                    canais.map((canal) => (
                      <SelectItem key={canal.id} value={canal.id}>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 opacity-60" />
                          {canal.nome}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      {loadingCanais ? "Carregando canais..." : "Nenhum canal encontrado"}
                    </div>
                  )}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                Escolha um canal do servidor onde o bot está conectado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateGrupo}
              disabled={loadingCreate}
            >
              {loadingCreate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Grupo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={grupoDelecao !== null} onOpenChange={(open) => {
        if (!open) setGrupoDelecao(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este grupo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => grupoDelecao && handleDeleteGrupo(grupoDelecao)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default GroupManager
