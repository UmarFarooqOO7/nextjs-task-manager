import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import client, { dbReady } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      await dbReady
      const githubId = String(profile?.id ?? user.id)
      const name = user.name ?? profile?.login ?? "Unknown"
      const email = user.email ?? null
      const avatarUrl = user.image ?? null

      await client.execute({
        sql: `INSERT INTO users (id, name, email, avatar_url)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                email = excluded.email,
                avatar_url = excluded.avatar_url`,
        args: [githubId, name, email, avatarUrl],
      })
      return true
    },
    async jwt({ token, user, profile }) {
      if (profile) {
        token.uid = String(profile.id)
      } else if (user?.id) {
        token.uid = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string
      }
      return session
    },
  },
})
