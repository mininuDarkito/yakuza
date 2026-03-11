import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ProdutosList } from "@/components/dashboard/produtos/produtos-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ProdutosPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  // Verificação de segurança
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso negado. Por favor, faça login.</p>
      </div>
    )
  }

  /**
   * QUERY GLOBAL ATUALIZADA:
   * 1. Buscamos as colunas fixas da tabela 'produtos' (Catálogo)
   * 2. Buscamos Preço e Ativo da tabela 'user_series' (Seus dados)
   * 3. Buscamos o Nome do Grupo da tabela 'grupos'
   * Usamos LEFT JOIN para que séries que você ainda não configurou também apareçam.
   */
  const res = await sql.query(`
    SELECT 
      p.id,
      p.nome,
      p.descricao,
      p.imagem_url,
      p.link_serie,
      p.plataforma,
      p.created_at,
      COALESCE(us.preco, 0) as preco, 
      COALESCE(us.ativo, true) as ativo,
      COALESCE(g.nome, 'Sem Grupo') as grupo_nome
    FROM produtos p
    LEFT JOIN user_series us ON p.id = us.produto_id AND us.user_id = $1
    LEFT JOIN grupos g ON us.grupo_id = g.id
    ORDER BY p.created_at DESC
  `, [userId])

  const produtos = res.rows

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Séries</h1>
          <p className="text-muted-foreground">
            Explore o catálogo global e defina seus preços de venda.
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/dashboard/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Série
          </Link>
        </Button>
      </div>

      <ProdutosList produtos={produtos} />
    </div>
  )
}