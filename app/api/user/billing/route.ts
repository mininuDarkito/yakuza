import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { z } from "zod"

// 1. Atualizado para incluir "Binance" conforme o novo componente
const billingSchema = z.object({
  nome_beneficiario: z.string().min(3).max(100),
  tipo_chave: z.enum(["pix", "email", "telefone", "cpf", "cnpj", "Binance"]),
  chave_pix: z.string().min(1).max(100),
  userId: z.string().uuid().optional(), // ID opcional para quando o Admin edita
})

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validatedData = billingSchema.parse(body)

    // 2. Lógica de Permissão:
    // Se o Admin enviou um userId no body, ele quer editar outro usuário.
    // Se não enviou, o usuário logado está editando a si mesmo.
    const targetUserId = (session.user.role === 'admin' && validatedData.userId) 
      ? validatedData.userId 
      : session.user.id

    // Removemos o userId do objeto antes de salvar no JSONB do banco
    const { userId: _, ...dataToSave } = validatedData

    // 3. Atualização no Banco de Dados
    const result = await sql.query(`
      UPDATE users 
      SET billing_setup = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id
    `, [JSON.stringify(dataToSave), targetUserId])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // 4. Log de Auditoria Aprimorado
    // Registra quem fez a alteração (útil se o Admin mudar os dados do usuário)
    await sql.query(`
      INSERT INTO activity_logs (user_id, action, entity_type, details)
      VALUES ($1, 'update_billing', 'user', $2)
    `, [
      session.user.id, 
      JSON.stringify({ 
        target_user: targetUserId,
        ip: request.headers.get('x-forwarded-for') || 'local',
        changed_by_admin: session.user.role === 'admin'
      })
    ])

    return NextResponse.json({ message: "Configurações de recebimento atualizadas!" })

  } catch (error) {
    console.error("❌ Erro ao salvar billing:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 })
  }
}