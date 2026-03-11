import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { sql } from "./db"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // Adicionamos 'identify' e 'guilds' caso você queira checar o servidor no futuro
      authorization: { params: { scope: 'identify email' } },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as {
          id: string
          username: string
          avatar: string | null
          email?: string
        }

        try {
          // Upsert: Garante que o usuário existe e atualiza os dados do Discord
          await sql.query(
            `
            INSERT INTO users (discord_id, discord_username, discord_avatar, email)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (discord_id) 
            DO UPDATE SET 
              discord_username = EXCLUDED.discord_username,
              discord_avatar = EXCLUDED.discord_avatar,
              email = EXCLUDED.email,
              updated_at = NOW()
            `,
            [discordProfile.id, discordProfile.username, discordProfile.avatar, discordProfile.email || null]
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

    async jwt({ token, user, account, profile }) {
      // Na primeira vez que o JWT é criado (login)
      if (account && profile) {
        token.sub = (profile as { id: string }).id
        
        // Buscamos o ROLE no banco para colocar no Token
        const res = await sql.query("SELECT role FROM users WHERE discord_id = $1", [token.sub])
        if (res.rows.length > 0) {
          token.role = res.rows[0].role // Adiciona 'admin' ou 'user' ao token
        }
      }
      return token
    },

    async session({ session, token }) {
      if (!token.sub) return session

      try {
        const res = await sql.query(
          `SELECT id, discord_id, discord_username, discord_avatar, role 
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
            role: dbUser.role, // <-- ESSENCIAL: Agora a sessão sabe se é admin
          }
        }
      } catch (error) {
        console.error("❌ Erro ao carregar sessão:", error)
      }

      return session
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },
}

// ATUALIZAÇÃO DA TIPAGEM (TypeScript)
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      discordId: string
      discordUsername: string
      discordAvatar: string | null
      role: string // <-- Adicionado aqui
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}