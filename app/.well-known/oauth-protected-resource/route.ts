export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? `${url.protocol}//${url.host}`

  return Response.json({
    resource: origin,
    authorization_servers: [origin],
    scopes_supported: ["mcp:tools"],
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
