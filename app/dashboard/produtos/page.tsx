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
  const userRole = session?.user?.role

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-zinc-500 font-black italic uppercase">Acesso negado. Faça login.</p>
      </div>
    )
  }

  /**
   * QUERY ATUALIZADA:
   * 1. Usamos INNER JOIN em user_series para trazer APENAS o que VOCÊ registrou.
   * 2. Trazemos o us.id como 'vinculo_id' para o seu componente deletar/editar o registro certo.
   * 3. Filtramos por us.user_id = $1 para você não ver as séries do Jakson ou do Dark.
   */
  const res = await sql.query(`
    SELECT 
      p.id as produto_id,
      p.nome,
      p.descricao,
      p.imagem_url,
      p.link_serie,
      p.plataforma,
      p.created_at,
      us.id as id, -- ID da tabela user_series (PK do vínculo)
      gs.preco, 
      us.ativo,
      g.nome as grupo_nome
    FROM produtos p
    INNER JOIN user_series us ON p.id = us.produto_id
    INNER JOIN grupos g ON us.grupo_id = g.id
    INNER JOIN grupo_series gs ON p.id = gs.produto_id AND us.grupo_id = gs.grupo_id
    WHERE us.user_id = $1
    ORDER BY p.nome ASC, g.nome ASC
  `, [userId])

  const produtos = res.rows

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-white">
            Meus <span className="text-primary text-2xl">Registros</span>
          </h1>
          <p className="text-zinc-500 font-bold italic text-xs uppercase tracking-widest mt-1">
            Gerencie as obras que você está vendendo nos canais do Discord.
          </p>
        </div>
        
        {/* Botão de Adicionar Série permanece para todos os vendedores poderem vincular novas obras */}
        <Button asChild className="font-black uppercase italic bg-primary text-black hover:scale-105 transition-all rounded-xl shadow-lg shadow-primary/20">
          <Link href="/dashboard/produtos/novo">
            <Plus className="mr-2 h-5 w-5" />
            Vincular Nova Série
          </Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* O componente ProdutosList agora recebe apenas os SEUS vínculos agrupados */}
        <ProdutosList produtos={produtos} />
      </div>
    </div>
  )
}