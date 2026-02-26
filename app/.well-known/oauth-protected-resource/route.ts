import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const origin = `${url.protocol}//${url.host}`

    return NextResponse.json({
      resource: origin,
      authorization_servers: [origin],
      scopes_supported: ["mcp:tools"],
    }, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (e) {
    console.error("oauth-protected-resource error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
