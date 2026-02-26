import { exchangeCode } from "@/lib/oauth"

export async function POST(req: Request) {
  try {
    // Support both form-urlencoded and JSON bodies
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
      return Response.json(
        { error: "unsupported_grant_type", error_description: "Only authorization_code is supported" },
        { status: 400 }
      )
    }

    if (!code || !client_id || !code_verifier || !redirect_uri) {
      return Response.json(
        { error: "invalid_request", error_description: "Missing required parameters" },
        { status: 400 }
      )
    }

    const result = await exchangeCode(code, client_id, code_verifier, redirect_uri)

    if (!result) {
      return Response.json(
        { error: "invalid_grant", error_description: "Invalid or expired authorization code, or PKCE verification failed" },
        { status: 400 }
      )
    }

    return Response.json({
      access_token: result.access_token,
      token_type: "Bearer",
      expires_in: 2592000,
      scope: result.scope ?? "mcp:tools",
    })
  } catch (e) {
    console.error("[OAuth] Token exchange error:", e)
    return Response.json(
      { error: "server_error", error_description: "An internal error occurred" },
      { status: 500 }
    )
  }
}
