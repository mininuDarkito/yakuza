import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

// Validação rigorosa dos dados de cobrança
const billingSchema = z.object({
  nome_beneficiario: z.string().min(3).max(100),
  tipo_chave: z.enum(["pix", "email", "telefone", "cpf", "cnpj"]),
  chave_pix: z.string().min(1).max(100),
  instrucoes: z.string().max(500).optional(),
})

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = billingSchema.parse(body)

    // Atualiza o campo JSONB no banco de dados
    // O operador || no PostgreSQL para JSONB faz o "merge" (mescla) dos dados
    await sql.query(`
      UPDATE users 
      SET billing_setup = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(validatedData), userId])

    // Log de auditoria para o Admin saber que o usuário mudou os dados de recebimento
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'update_billing', 'user', $2)
    `, [userId, JSON.stringify({ ip: request.headers.get('x-forwarded-for') })])

    return NextResponse.json({ message: "Configurações salvas!" })

  } catch (error) {
    console.error("Erro ao salvar billing:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}