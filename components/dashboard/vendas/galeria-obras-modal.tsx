"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, BookImage, Loader2, CheckCircle2, X, Layers } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function GaleriaObrasModal({ isOpen, onClose, onSelect }: any) {
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [plataforma, setPlataforma] = useState("TODAS")
  const [obras, setObras] = useState<any[]>([])
  const [listaPlataformas, setListaPlataformas] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    if (isOpen) {
      fetch("/api/user/plataforma").then(res => res.json()).then(data => {
        if (Array.isArray(data)) setListaPlataformas(data)
      })
    }
  }, [isOpen])

  // Resetar página ao trocar filtros
  useEffect(() => {
    setPage(1);
  }, [search, plataforma]);

  const loadObras = useCallback(async (isFirstLoad: boolean = false) => {
    const currentPage = isFirstLoad ? 1 : page
    setLoading(true)

    try {
      const platQuery = plataforma !== "TODAS" ? `&plataforma=${encodeURIComponent(plataforma)}` : ""
      const limit = 20
      const res = await fetch(`/api/user/catalogo/galeria?search=${encodeURIComponent(search)}${platQuery}&page=${currentPage}&limit=${limit}`)
      const data = await res.json()

      setObras(data)
      const total = data.length > 0 ? parseInt(data[0].total_count) : 0
      setTotalItems(total)
      setHasMore(total > currentPage * limit)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false);
    }
  }, [search, plataforma, page])

  useEffect(() => {
    if (isOpen) loadObras()
  }, [page, isOpen, search, plataforma])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        {/* Overlay fixo em toda a tela */}
        <DialogOverlay className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl transition-all" />

        <DialogContent
          // O segredo: !left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-full !max-h-full
          className="fixed !left-0 !top-0 z-[101] flex !h-screen !w-screen !max-w-full !max-h-full !translate-x-0 !translate-y-0 flex-col border-none bg-background p-0 shadow-none outline-none ring-0 duration-0"
        >
          {/* HEADER FIXO */}
          <div className="flex shrink-0 flex-col border-b border-border bg-card p-6 md:px-10 md:py-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl border border-primary/20">
                  <BookImage className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-foreground leading-none">
                    GALERIA <span className="text-primary">DE OBRAS</span>
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-[10px] font-bold uppercase italic tracking-[0.2em] text-muted-foreground">
                    Yakuza Raws • Acervo Global
                  </DialogDescription>
                </div>
              </div>

              <div className="flex w-full items-center gap-3 md:w-auto">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-4 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="BUSCAR SÉRIE..."
                    className="h-12 rounded-2xl border-border bg-background pl-12 font-bold italic text-xs uppercase"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={plataforma}
                  onValueChange={(value) => {
                    setPlataforma(value);
                    setPage(1); // Resetar página ao trocar filtro
                  }}
                >
                  <SelectTrigger className="h-12 w-40 rounded-2xl border-border bg-background font-black italic uppercase text-xs">
                    <SelectValue placeholder="ORIGEM" />
                  </SelectTrigger>

                  {/* O segredo está no z-[110] e no position fixed ou use o SelectPortal */}
                  <SelectContent className="z-[110] border-border bg-popover shadow-2xl">
                    <SelectItem value="TODAS" className="font-bold italic uppercase text-xs cursor-pointer">
                      TODAS
                    </SelectItem>
                    {listaPlataformas.map((plat) => (
                      <SelectItem
                        key={plat}
                        value={plat}
                        className="font-bold italic uppercase text-xs cursor-pointer"
                      >
                        {plat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" onClick={onClose} className="h-12 w-12 rounded-2xl hover:bg-muted transition-colors"><X size={24} /></Button>
              </div>
            </div>
          </div>

          {/* GRID COM SCROLL REAL (USANDO DIV NATIVA PARA EVITAR CONFLITOS COM O RADIX) */}
          <div className="flex-1 overflow-y-auto bg-background/50 scrollbar-hide">
            <div className="mx-auto max-w-[1920px] p-8 md:p-12">
              {loading ? (
                <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-[10px] font-black uppercase italic tracking-[0.3em] text-muted-foreground animate-pulse">Sincronizando Banco de Dados...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
                  {obras.map((obra, index) => (
                    <div
                      key={`${obra.id}-${index}`}
                      onClick={() => { onSelect(obra); onClose(); }}
                      className="group cursor-pointer flex flex-col gap-3"
                    >
                      {/* FORÇANDO O ASPECT RATIO E FORMATO RETANGULAR */}
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2.5rem] border-2 border-border bg-muted/20 transition-all duration-500 group-hover:border-primary shadow-2xl">
                        {obra.imagem_url ? (
                          <img
                            src={obra.imagem_url}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center opacity-20"><BookImage size={48} /></div>
                        )}

                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/70 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
                          <CheckCircle2 size={50} className="text-white drop-shadow-2xl" />
                          <span className="mt-3 text-[11px] font-black italic uppercase text-white tracking-widest">VINCULAR</span>
                        </div>

                        <div className="absolute top-4 right-4">
                          <Badge className="border-none bg-black/90 px-3 py-1 text-[9px] font-black italic text-white uppercase backdrop-blur-md">{obra.plataforma}</Badge>
                        </div>
                      </div>
                      <p className="px-2 text-center text-[10px] font-black italic uppercase leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {obra.nome}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RODAPÉ FIXO COM PAGINAÇÃO */}
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-card px-10 py-5">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-[10px] font-black italic uppercase text-muted-foreground tracking-widest">
                <Layers className="h-4 w-4 text-primary" />
                <span>Registros: {totalItems} obras no total</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={page === 1 || loading}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 rounded-lg border-border bg-background px-3 font-black italic uppercase text-[9px] hover:text-primary"
                >
                  Anterior
                </Button>
                <div className="flex h-8 items-center justify-center rounded-lg bg-primary/10 px-4 text-[10px] font-black italic text-primary">
                  PÁGINA {page}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!hasMore || loading}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 rounded-lg border-border bg-background px-3 font-black italic uppercase text-[9px] hover:text-primary"
                >
                  Próxima
                </Button>
              </div>
            </div>

            <Button variant="ghost" onClick={onClose} className="text-[10px] font-black italic uppercase text-muted-foreground hover:text-primary transition-colors">
              Fechar Galeria
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}