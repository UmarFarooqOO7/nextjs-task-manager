import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const origin = `${url.protocol}//${url.host}`

    return NextResponse.json({
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
  } catch (e) {
    console.error("oauth-authorization-server error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
