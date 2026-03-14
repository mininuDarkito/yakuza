import { getServerSession } from "next-auth"
import { notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { ProdutoForm } from "@/components/dashboard/produtos/produto-form"


export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  const { id } = await params // Pega o ID da série na URL

  if (!userId) return <div>Acesso negado.</div>

  const [resProduto, resGrupos] = await Promise.all([
    sql.query(`
      SELECT p.id, p.nome, p.descricao, p.imagem_url, p.link_serie, p.plataforma,
             us.preco, us.ativo, us.grupo_id
      FROM produtos p
      LEFT JOIN user_series us ON p.id = us.produto_id AND us.user_id = $2
      WHERE p.id = $1
    `, [id, userId]),
    sql.query('SELECT id, nome FROM grupos WHERE user_id = $1 ORDER BY nome', [userId])
  ])

  if (resProduto.rows.length === 0) notFound()

  return (

    
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-3xl font-bold">Configurar Série</h1>
      <p className="text-muted-foreground">Ajuste seus dados para: {resProduto.rows[0].nome}</p>
      <ProdutoForm produto={resProduto.rows[0]} grupos={resGrupos.rows} />
    </div>
  )
}