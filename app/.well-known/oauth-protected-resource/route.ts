import { headers } from "next/headers"

function getOrigin(h: Headers): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL.replace(/\/$/, "")
  const host = h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function GET() {
  const h = await headers()
  const origin = getOrigin(h)

  return Response.json({
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ["mcp:tools"],
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
