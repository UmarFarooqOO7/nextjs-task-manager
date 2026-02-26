import GitHub from "next-auth/providers/github"
import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
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
}
