export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    // Protect everything except API routes, login, and static assets
    "/((?!api/|login|_next/static|_next/image|favicon.ico).*)",
  ],
}
