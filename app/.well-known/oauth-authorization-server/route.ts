export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? `${url.protocol}//${url.host}`

  return Response.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    scopes_supported: ["mcp:tools"],
  }, {
    headers: { "Cache-Control": "no-store" },
  })
}
