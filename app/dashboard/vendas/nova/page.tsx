import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { VendaRegistroForm } from "@/components/dashboard/vendas/VendaRegistroForm" // O novo componente
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Loader2, ShoppingCart, Info } from "lucide-react"

export default async function NovaVendaPage(props: {
  searchParams: Promise<{ produto_id?: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { produto_id } = await props.searchParams

  if (!userId) redirect("/login")

  // --- VALIDAÇÃO DE UUID ---
  const isValidUuid = (id: any): id is string => {
    if (!id || typeof id !== 'string' || id === "undefined" || id === "null") return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // --- LÓGICA DE AUTO-VÍNCULO (FLUXO RÁPIDO) ---
  if (isValidUuid(produto_id)) {
    const checkRes = await sql.query(
      "SELECT id FROM user_series WHERE user_id = $1 AND produto_id = $2",
      [userId, produto_id]
    )

    if (checkRes.rows.length === 0) {
      const grupoRes = await sql.query(
        "SELECT id FROM grupos WHERE user_id = $1 LIMIT 1",
        [userId]
      )
      
      const grupoPadrao = grupoRes.rows[0]?.id
      
      if (grupoPadrao) {
        await sql.query(`
          INSERT INTO user_series (user_id, produto_id, grupo_id, ativo, created_at)
          VALUES ($1, $2, $3, true, NOW())
          ON CONFLICT (user_id, produto_id, grupo_id) DO NOTHING
        `, [userId, produto_id, grupoPadrao])

        // Garante que o grupo tenha um preço base definido
        await sql.query(`
          INSERT INTO grupo_series (produto_id, grupo_id, preco, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (grupo_id, produto_id) DO NOTHING
        `, [produto_id, grupoPadrao, 1.00])
      }
    }
  }

  // --- CARREGAMENTO DE DADOS (AGORA COM DADOS GLOBAIS PARA O FORM NOVO) ---
  const [gruposRes, produtosRes] = await Promise.all([
    sql.query(`
        SELECT DISTINCT g.id, g.nome 
        FROM grupos g
        LEFT JOIN user_series us ON us.grupo_id = g.id
        WHERE g.user_id = $1 OR us.user_id = $1
        ORDER BY g.nome`, [userId]
    ),
    sql.query(`
      SELECT 
        us.id as vinculo_id, 
        p.id as produto_id,
        p.nome, 
        p.nome_alternativo,
        p.imagem_url, 
        p.descricao,
        gs.preco, 
        us.grupo_id,
        p.plataforma
      FROM produtos p
      INNER JOIN user_series us ON p.id = us.produto_id
      INNER JOIN grupo_series gs ON p.id = gs.produto_id AND us.grupo_id = gs.grupo_id
      WHERE us.user_id = $1 AND us.ativo = true
      ORDER BY p.nome
    `, [userId]),
  ])

  const grupos = gruposRes.rows
  const obrasVinculadas = produtosRes.rows

  // Redirecionamento amigável se o vendedor estiver "limpo"
  if (obrasVinculadas.length === 0 && !isValidUuid(produto_id)) {
    redirect("/dashboard/explorar")
  }

  return (
    <div className="container mx-auto p-4 md:p-10 space-y-10">
      
      {/* HEADER SEMÂNTICO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-4 rounded-[2rem] border border-primary/20">
                <ShoppingCart className="text-primary h-8 w-8" />
            </div>
            <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter text-foreground italic leading-none">
                  TERMINAL DE <span className="text-primary">LANÇAMENTO</span>
                </h1>
                <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
                    Yakuza Raws • Gestão de Faturamento v3.0
                </p>
            </div>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full border border-border">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase italic tracking-widest text-muted-foreground">Sistema Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* COMPONENTE PRINCIPAL (O FORMULÁRIO QUE CRIAMOS) */}
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-24 gap-4 bg-card rounded-[3rem] border border-border">
              <Loader2 className="animate-spin text-primary h-12 w-12" />
              <p className="font-black uppercase italic text-xs tracking-widest opacity-50">Carregando Interface...</p>
          </div>
        }>
          <VendaRegistroForm 
            grupos={grupos} 
            obrasVinculadas={obrasVinculadas}
            initialProdutoId={isValidUuid(produto_id) ? produto_id : undefined} 
          />
        </Suspense>
      </div>

      {/* FOOTER DE APOIO */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground opacity-30 hover:opacity-100 transition-opacity">
        <Info size={14} />
        <span className="text-[9px] font-black uppercase italic tracking-widest">
          O registro de capítulos gera entradas individuais no banco para fins de auditoria.
        </span>
      </div>
    </div>
  )
}