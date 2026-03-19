import { NextAuthOptions, DefaultSession } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { sql } from "./db"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // ADICIONADO: 'guilds' para podermos listar os servidores/canais do user
      authorization: { params: { scope: 'identify email guilds' } },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
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
          await sql.query(
            `
            INSERT INTO users (discord_id, discord_username, discord_avatar, discord_banner, email)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (discord_id) 
            DO UPDATE SET 
              discord_username = EXCLUDED.discord_username,
              discord_avatar = EXCLUDED.discord_avatar,
              discord_banner = EXCLUDED.discord_banner,
              email = EXCLUDED.email,
              updated_at = NOW()
            `,
            [
              discordProfile.id, 
              discordProfile.username, 
              discordProfile.avatar, 
              bannerUrl,
              discordProfile.email || null
            ]
          )

          const userRes = await sql.query(`SELECT id FROM users WHERE discord_id = $1`, [discordProfile.id])

          if (userRes.rows.length > 0) {
            await sql.query(
              `INSERT INTO activity_logs (user_id, action, entity_type, details) VALUES ($1, 'login', 'user', $2)`,
              [userRes.rows[0].id, JSON.stringify({ provider: "discord" })]
            )
          }
        } catch (error) {
          console.error("❌ Erro ao salvar usuário:", error)
          return false
        }
      }
      return true
    },

    async jwt({ token, account, user }) {
      // PERSISTÊNCIA DO TOKEN: Salva o access_token do Discord no JWT
      if (account) {
        token.accessToken = account.access_token
      }
      
      if (user) {
        const res = await sql.query("SELECT role, id FROM users WHERE discord_id = $1", [token.sub])
        if (res.rows.length > 0) {
          token.role = res.rows[0].role
          token.dbId = res.rows[0].id
        }
      }
      return token
    },

    async session({ session, token }) {
      // PASSA O TOKEN PARA A SESSÃO: Assim o componente e a API conseguem usar
      session.accessToken = token.accessToken as string;

      if (token.sub) {
        try {
          const res = await sql.query(
            `SELECT id, discord_id, discord_username, discord_avatar, discord_banner, role 
             FROM users WHERE discord_id = $1`,
            [token.sub]
          )

          if (res.rows.length > 0) {
            const dbUser = res.rows[0]
            session.user = {
              ...session.user,
              id: dbUser.id,
              discordId: dbUser.discord_id,
              discordUsername: dbUser.discord_username,
              discordAvatar: dbUser.discord_avatar,
              discordBanner: dbUser.discord_banner,
              role: dbUser.role,
            }
          }
        } catch (error) {
          console.error("❌ Erro ao carregar sessão:", error)
        }
      }

      return session
    },
  },

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
}

// ATUALIZAÇÃO DA TIPAGEM (Blindagem TypeScript)
declare module "next-auth" {
  interface Session {
    accessToken?: string; // <-- Adicionado para a API de canais
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