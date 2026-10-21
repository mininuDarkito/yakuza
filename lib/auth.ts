import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { prisma } from "./db"
import { getSettings } from "./settings"

function discordProvider(clientId: string, clientSecret: string) {
  return DiscordProvider({
    clientId,
    clientSecret,
    issuer: "https://discord.com",
    authorization: { params: { scope: 'identify email guilds' } },
    checks: ['state'],
  })
}

const baseAuthOptions: Omit<NextAuthOptions, "providers"> = {
  // NEXTAUTH_SECRET continua no .env (assina a sessão e protege os segredos do banco)
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as {
          id: string
          username: string
          avatar: string | null
          banner: string | null
          email?: string
        }

        const bannerUrl = discordProfile.banner
          ? `https://cdn.discordapp.com/banners/${discordProfile.id}/${discordProfile.banner}.png?size=1024`
          : null;

        try {
          const user = await prisma.users.upsert({
            where: { discord_id: discordProfile.id },
            update: {
              discord_username: discordProfile.username,
              discord_avatar: discordProfile.avatar,
              discord_banner: bannerUrl,
              email: discordProfile.email || null,
              updated_at: new Date(),
            },
            create: {
              discord_id: discordProfile.id,
              discord_username: discordProfile.username,
              discord_avatar: discordProfile.avatar,
              discord_banner: bannerUrl,
              email: discordProfile.email || null,
            },
          })

          await prisma.activity_logs.create({
            data: {
              user_id: user.id,
              action: 'login',
              entity_type: 'user',
              details: { provider: "discord" }
            }
          })
        } catch (error) {
          console.error("❌ Erro ao salvar usuário:", error)
          return false
        }
      }
      return true
    },

    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
      }

      if (user || token.sub) {
        const dbUser = await prisma.users.findUnique({
          where: { discord_id: token.sub as string },
          select: { role: true, id: true }
        })
        if (dbUser) {
          token.role = dbUser.role || 'user'
          token.dbId = dbUser.id
        }
      }
      return token
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;

      if (token.sub) {
        try {
          const dbUser = await prisma.users.findUnique({
            where: { discord_id: token.sub as string },
            select: {
              id: true,
              discord_id: true,
              discord_username: true,
              discord_avatar: true,
              discord_banner: true,
              role: true
            }
          })

          if (dbUser) {
            session.user = {
              ...session.user,
              id: dbUser.id,
              discordId: dbUser.discord_id,
              discordUsername: dbUser.discord_username,
              discordAvatar: dbUser.discord_avatar,
              discordBanner: dbUser.discord_banner,
              role: dbUser.role || 'user',
            }
          }
        } catch (error) {
          console.error("❌ Erro ao carregar sessão:", error)
        }
      }

      return session
    },
  },

  pages: { signIn: "/logar" },
  session: { strategy: "jwt" },
}

/**
 * Opções usadas por `getServerSession(authOptions)` em todo o projeto.
 * Ler/validar a sessão só precisa do `secret` e dos callbacks, então o provider
 * aqui não carrega credenciais.
 */
export const authOptions: NextAuthOptions = {
  ...baseAuthOptions,
  providers: [discordProvider("", "")],
}

/**
 * Opções completas para o fluxo de login (/api/auth/[...nextauth]).
 * O Client ID/Secret do Discord vêm do banco (Admin › Configurações).
 */
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = await getSettings([
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
  ] as const)

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error(
      "❌ [AUTH]: Client ID/Secret do Discord não configurados (Admin › Configurações).",
    )
  }

  return {
    ...baseAuthOptions,
    providers: [
      discordProvider(DISCORD_CLIENT_ID ?? "", DISCORD_CLIENT_SECRET ?? ""),
    ],
  }
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string
      discordId: string
      discordUsername: string
      discordAvatar: string | null
      discordBanner: string | null
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface JWT {
    accessToken?: string;
    role?: string;
    dbId?: string;
  }
}