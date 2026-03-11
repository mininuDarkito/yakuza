import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await getServerSession(authOptions)

  // Proteção: Apenas usuários logados podem ver a lista de plataformas
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    // IMPORTANTE: Usando a coluna 'plataforma' para bater com seu banco
    const res = await sql.query(`
      SELECT DISTINCT plataforma 
      FROM produtos 
      WHERE plataforma IS NOT NULL 
      AND plataforma != ''
      ORDER BY plataforma ASC
    `)
    
    // Retorna apenas um array de strings ["XINGLING", "KOLAME", ...]
    const plataformas = res.rows.map(r => r.plataforma)
    
    return NextResponse.json(plataformas)
  } catch (error) {
    console.error("❌ Erro ao buscar plataformas:", error)
    return NextResponse.json([], { status: 500 })
  }
}