import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  SettingsValidationError,
  applyTimezoneFromSettings,
  getSettingsStatus,
  updateSettings,
} from "@/lib/settings"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "admin") return null
  return session
}

// GET /api/admin/configuracoes — estado das configurações (segredos vêm mascarados)
export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })
  }

  try {
    return NextResponse.json({ settings: await getSettingsStatus() })
  } catch (error: any) {
    console.error("[API_CONFIGURACOES] Erro ao ler configurações:", error)
    return NextResponse.json({ error: "Não foi possível ler as configurações." }, { status: 500 })
  }
}

// PUT /api/admin/configuracoes — body: { changes: { CHAVE: "valor" | null } }
// Texto = grava, null/vazio = remove, chave ausente = não altera.
export async function PUT(req: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: "Acesso restrito a administradores." }, { status: 403 })
  }

  try {
    const body = await req.json().catch(() => null)
    const changes = body?.changes
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      return NextResponse.json({ error: "Corpo inválido: envie { changes: { ... } }." }, { status: 400 })
    }

    const { updated, removed } = await updateSettings(changes)

    if (updated.includes("TZ") || removed.includes("TZ")) {
      await applyTimezoneFromSettings()
    }

    // Auditoria: registra apenas os NOMES das chaves, nunca os valores.
    if (updated.length > 0 || removed.length > 0) {
      await prisma.activity_logs
        .create({
          data: {
            user_id: session.user.id,
            action: "settings_update",
            entity_type: "settings",
            details: { updated, removed },
          },
        })
        .catch((e) => console.error("[API_CONFIGURACOES] Falha ao registrar auditoria:", e))
    }

    return NextResponse.json({
      success: true,
      updated,
      removed,
      settings: await getSettingsStatus(),
    })
  } catch (error: any) {
    if (error instanceof SettingsValidationError) {
      return NextResponse.json({ error: error.message, fields: error.errors }, { status: 400 })
    }
    console.error("[API_CONFIGURACOES] Erro ao salvar configurações:", error)
    return NextResponse.json({ error: "Não foi possível salvar as configurações." }, { status: 500 })
  }
}
