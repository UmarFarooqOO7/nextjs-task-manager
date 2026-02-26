import GitHub from "next-auth/providers/github"
import type { NextAuthConfig } from "next-auth"

/** Lightweight auth config for Edge middleware — no DB imports */
export const authConfig: NextAuthConfig = {
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isOnLogin = nextUrl.pathname === "/login"
      if (isOnLogin) return true
      if (!isLoggedIn) return false
      return true
    },
    async jwt({ token, profile }) {
      if (profile) {
        token.uid = String((profile as Record<string, unknown>).id)
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
}
