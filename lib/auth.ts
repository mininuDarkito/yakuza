import { NextAuthOptions } from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import { sql } from "./db"

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // 'identify' permite pegar o profile completo (incluindo o banner)
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
          banner: string | null // <-- Capturado do profile
          email?: string
        }

        // Lógica de URL do Banner do Discord
        const bannerUrl = discordProfile.banner 
          ? `https://cdn.discordapp.com/banners/${discordProfile.id}/${discordProfile.banner}.png?size=1024`
          : null;

        try {
          // Nota: Se você ainda não tem a coluna 'discord_banner' no banco, 
          // rode: ALTER TABLE users ADD COLUMN discord_banner TEXT;
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
              bannerUrl, // <-- Salvando a URL completa
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
          console.error("❌ Erro ao salvar usuário com banner:", error)
          return false
        }
      }
      return true
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = (profile as { id: string }).id
        
        const res = await sql.query("SELECT role, discord_banner FROM users WHERE discord_id = $1", [token.sub])
        if (res.rows.length > 0) {
          token.role = res.rows[0].role
          token.banner = res.rows[0].discord_banner // Coloca no token para ser rápido
        }
      }
      return token
    },

    async session({ session, token }) {
      if (!token.sub) return session

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
            discordBanner: dbUser.discord_banner, // <-- Enviando para o Frontend
            role: dbUser.role,
          }
        }
      } catch (error) {
        console.error("❌ Erro ao carregar sessão:", error)
      }

      return session
    },
  },

  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
}

// ATUALIZAÇÃO DA TIPAGEM
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      discordId: string
      discordUsername: string
      discordAvatar: string | null
      discordBanner: string | null // <-- Adicionado aqui
      role: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}