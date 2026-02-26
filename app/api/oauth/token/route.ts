import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? ""
    let params: Record<string, string>

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text()
      params = Object.fromEntries(new URLSearchParams(text))
    } else {
      params = await req.json()
    }

    const { grant_type, code, client_id, code_verifier, redirect_uri } = params

    if (grant_type !== "authorization_code") {
      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: "Only authorization_code is supported" },
        { status: 400 }
      )
    }

    if (!code || !client_id || !code_verifier || !redirect_uri) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      )
    }

    // Lazy import to avoid module-level crash on Vercel
    const { exchangeCode } = await import("@/lib/oauth")
    const result = await exchangeCode(code, client_id, code_verifier, redirect_uri)

    if (!result) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid or expired authorization code, or PKCE verification failed" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      access_token: result.access_token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: result.scope ?? "mcp:tools",
    })
  } catch (e) {
    console.error("[OAuth] Token exchange error:", e)
    return NextResponse.json(
      { error: "server_error", error_description: String(e) },
      { status: 500 }
    )
  }
}
