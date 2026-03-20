"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, PlusCircle, Loader2, BookImage, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProdutoCatalogo {
    id: string
    nome: string
    imagem_url: string | null
    plataforma: string | null
    descricao: string | null
    link_serie: string | null
}

export function ExplorarCatalogo() {
    const [obras, setObras] = useState<ProdutoCatalogo[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [plataforma, setPlataforma] = useState("TODAS")
    const [listaPlataformas, setListaPlataformas] = useState<string[]>([])
    
    // Estados de Paginação
    const [page, setPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const itemsPerPage = 18 // 3 linhas x 6 colunas

    const router = useRouter()

    const fetchPlataformas = async () => {
        try {
            const res = await fetch(`/api/user/plataforma`)
            const data = await res.json()
            if (Array.isArray(data)) setListaPlataformas(data)
        } catch (error) {
            console.error("Erro ao carregar plataformas")
        }
    }

    const loadCatalogo = async () => {
        setLoading(true)
        try {
            const platQuery = plataforma !== "TODAS" ? `&plataforma=${encodeURIComponent(plataforma)}` : ""
            // Enviamos a página atual para a API
            const res = await fetch(`/api/user/catalogo?search=${encodeURIComponent(search)}${platQuery}&page=${page}&limit=${itemsPerPage}`)
            const data = await res.json()
            
            // Esperamos que a API retorne { items: [], total: number }
            setObras(data.items || [])
            setTotalItems(data.total || 0)
        } catch (error) {
            toast.error("Erro ao carregar catálogo global.")
        } finally {
            setLoading(false)
        }
    }

    // Reseta para a página 1 sempre que mudar o filtro ou busca
    useEffect(() => {
        setPage(1)
    }, [search, plataforma])

    useEffect(() => {
        fetchPlataformas()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => loadCatalogo(), 500)
        return () => clearTimeout(timer)
    }, [search, plataforma, page])

    const totalPages = Math.ceil(totalItems / itemsPerPage)

    return (
        <div className="space-y-8">
            {/* HEADER E FILTROS */}
            <div className="flex flex-col gap-6">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground">Explorar Acervo</h2>
                
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="PROCURAR OBRA NO ACERVO DA YAKUZA..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-11 h-14 bg-muted/50 border-border font-bold italic uppercase rounded-xl"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                className="h-14 px-8 font-black uppercase italic border-2 border-primary/20 hover:border-primary transition-all rounded-xl min-w-[180px]"
                            >
                                {plataforma === "TODAS" ? "Plataforma" : plataforma}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-popover border-border min-w-[200px] rounded-xl shadow-2xl">
                            <DropdownMenuLabel className="font-black uppercase italic text-[10px] text-muted-foreground p-3">
                                Filtrar por Origem
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setPlataforma("TODAS")}
                                className="font-bold uppercase italic p-3 focus:bg-primary focus:text-primary-foreground cursor-pointer"
                            >
                                TODAS AS OBRAS
                            </DropdownMenuItem>
                            {listaPlataformas.map((plat) => (
                                <DropdownMenuItem
                                    key={plat}
                                    onClick={() => setPlataforma(plat)}
                                    className="font-bold uppercase italic p-3 focus:bg-primary focus:text-primary-foreground cursor-pointer"
                                >
                                    {plat}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* GRID DE RESULTADOS (6 COLUNAS) */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-primary h-12 w-12" />
                </div>
            ) : (
                <>
                    {obras.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            {obras.map((obra) => (
                                <Card key={obra.id} className="group overflow-hidden border-border bg-card hover:border-primary/50 transition-all rounded-[1.5rem] flex flex-col">
                                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                                        {obra.imagem_url ? (
                                            <img 
                                                src={obra.imagem_url} 
                                                className="object-cover w-full h-full transition-transform group-hover:scale-110" 
                                                alt={obra.nome} 
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full opacity-20">
                                                <BookImage size={40} />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-background/80 backdrop-blur-md text-[9px] border-primary/20 uppercase font-black italic">
                                                {obra.plataforma}
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardContent className="p-4 flex-grow">
                                        <h3 className="font-black text-[11px] uppercase italic leading-tight line-clamp-2 min-h-[2.2rem]">
                                            {obra.nome}
                                        </h3>
                                    </CardContent>

                                    <CardFooter className="p-4 pt-0">
                                        <Button
                                            asChild
                                            className="w-full bg-primary text-primary-foreground font-black uppercase italic text-[9px] h-8 rounded-lg hover:scale-105 transition-transform"
                                        >
                                            <Link href={`/dashboard/produtos/novo?produtoId=${obra.id}&nome=${encodeURIComponent(obra.nome)}&plataforma=${encodeURIComponent(obra.plataforma || '')}&imagem=${encodeURIComponent(obra.imagem_url || '')}&link=${encodeURIComponent(obra.link_serie || '')}`}>
                                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Vincular
                                            </Link>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-border rounded-[2rem] bg-muted/5">
                            <p className="text-muted-foreground font-bold italic uppercase tracking-widest text-[10px]">
                                Nenhuma obra encontrada nesta página.
                            </p>
                        </div>
                    )}

                    {/* PAGINAÇÃO */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-6 pt-10">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-10 w-10 p-0 border-border bg-card rounded-xl hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>

                            <div className="flex items-center gap-2 font-black italic uppercase text-xs tracking-tighter">
                                <span className="text-primary">{page}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-muted-foreground">{totalPages}</span>
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="h-10 w-10 p-0 border-border bg-card rounded-xl hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}