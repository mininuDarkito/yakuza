import { getServerSession } from "next-auth"
import { notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ProdutoForm } from "@/components/dashboard/vendas/VendaRegistroForm"

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  
  // Este 'id' vindo da URL agora é o ID da tabela 'user_series' (PK do vínculo)
  const { id } = await params

  if (!userId) return <div className="p-10 font-black italic">ACESSO NEGADO.</div>

  /**
   * QUERY ATUALIZADA:
   * 1. Buscamos pelo ID do VÍNCULO (us.id) que veio na URL.
   * 2. Fazemos o JOIN com 'produtos' para pegar os dados globais (nome, capa, etc).
   * 3. Garantimos que o vínculo pertence ao usuário logado.
   */
  const [resVinculo, resGrupos] = await Promise.all([
    sql.query(`
      SELECT 
        us.id, -- ID do vínculo (user_series)
        us.grupo_id,
        us.preco,
        us.ativo,
        p.id as produto_id, -- ID global da obra
        p.nome,
        p.descricao,
        p.imagem_url,
        p.link_serie,
        p.plataforma
      FROM user_series us
      INNER JOIN produtos p ON p.id = us.produto_id
      WHERE us.id = $1 AND us.user_id = $2
    `, [id, userId]),
    
    // Lista todos os grupos globais para o Select do formulário
    sql.query('SELECT id, nome FROM grupos ORDER BY nome')
  ])

  const vinculo = resVinculo.rows[0]

  // Se não encontrar o vínculo (ou não for do usuário), dá 404
  if (!vinculo) {
    console.error(`Vínculo ${id} não encontrado para o usuário ${userId}`)
    notFound()
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">
          Configurar <span className="text-primary">Vínculo</span>
        </h1>
        <p className="text-zinc-500 font-bold italic text-xs uppercase tracking-widest mt-1">
          Ajustando preço e grupo para: <span className="text-zinc-300">{vinculo.nome}</span>
        </p>
      </div>

      <div className="max-w-3xl">
        {/* Passamos o vinculo que contém tanto dados da obra quanto do preço/grupo */}
        <ProdutoForm produto={vinculo} grupos={resGrupos.rows} />
      </div>
    </div>
  )
}