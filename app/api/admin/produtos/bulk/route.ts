import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  // Bloqueio de Segurança: Apenas ADM pode popular o catálogo global
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: "Acesso negado: Requer Admin" }, { status: 403 })
  }

  try {
    const { nomes, plataforma } = await request.json()

    if (!Array.isArray(nomes) || nomes.length === 0 || !plataforma) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Normalização: Tudo em UPPERCASE para manter o padrão no banco
    const plataformaFinal = plataforma.trim().toUpperCase()
    
    // Remove duplicatas da lista no código antes de mandar pro SQL
    const nomesLimpos = [...new Set(nomes.map((n: string) => n.trim()).filter(n => n !== ""))]

    // Montagem da query de Bulk Insert (Inserção em Lote)
    // Sanitizamos aspas simples (ex: JoJo's -> JoJo''s) para não quebrar o SQL
    const values = nomesLimpos.map((nome) => {
      const nomeEscapado = nome.replace(/'/g, "''")
      return `('${nomeEscapado}', '${plataformaFinal}')`
    }).join(",")

    // Query otimizada: Insere ou atualiza a plataforma se o nome já existir
    const query = `
      INSERT INTO produtos (nome, plataforma)
      VALUES ${values}
      ON CONFLICT (nome) 
      DO UPDATE SET plataforma = EXCLUDED.plataforma
      RETURNING id;
    `

    const res = await sql.query(query)

    // Log de auditoria para o painel de Admin
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'bulk_upload', 'produtos', $2)
    `, [session.user.id, JSON.stringify({ 
        total: nomesLimpos.length, 
        plataforma: plataformaFinal 
      })])

    return NextResponse.json({ 
      success: true, 
      message: `${res.rowCount} séries sincronizadas com sucesso.` 
    })

  } catch (error) {
    console.error("❌ Erro no processamento em lote:", error)
    return NextResponse.json({ error: "Falha ao salvar lote no banco" }, { status: 500 })
  }
}