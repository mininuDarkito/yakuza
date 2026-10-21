import NextAuth from "next-auth"
import { getAuthOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

// As credenciais do Discord ficam no banco (Admin › Configurações), então as
// opções são montadas a cada requisição (leitura em cache curto, custo baixo).
async function handler(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> },
) {
  const options = await getAuthOptions()
  return NextAuth(options)(req, ctx)
}

export { handler as GET, handler as POST }
