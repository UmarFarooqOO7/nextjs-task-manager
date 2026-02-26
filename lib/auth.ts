import NextAuth from "next-auth"
import client, { dbReady } from "./db"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, profile }) {
      await dbReady
      const gh = profile as Record<string, unknown> | undefined
      const githubId = String(gh?.id ?? user.id ?? "")
      const name = user.name ?? String(gh?.login ?? "Unknown")
      const email = user.email ?? null
      const avatarUrl = user.image ?? null

      await client.execute({
        sql: `INSERT INTO users (id, name, email, avatar_url)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                email = excluded.email,
                avatar_url = excluded.avatar_url`,
        args: [githubId, name, email ?? "", avatarUrl ?? ""],
      })
      return true
    },
  },
})
