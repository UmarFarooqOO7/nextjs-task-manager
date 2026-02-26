import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import client, { dbReady } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isOnLogin = nextUrl.pathname === "/login"
      if (isOnLogin) return true
      if (!isLoggedIn) return false
      return true
    },
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
    async jwt({ token, profile }) {
      if (profile) {
        const gh = profile as Record<string, unknown>
        token.uid = String(gh.id)
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
