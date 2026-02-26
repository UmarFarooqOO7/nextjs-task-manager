import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const clientId = url.searchParams.get("client_id")
    const redirectUri = url.searchParams.get("redirect_uri")
    const responseType = url.searchParams.get("response_type")
    const codeChallenge = url.searchParams.get("code_challenge")
    const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "S256"
    const state = url.searchParams.get("state")
    const scope = url.searchParams.get("scope")

    if (!clientId || !redirectUri || responseType !== "code" || !codeChallenge) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Missing required parameters (client_id, redirect_uri, response_type=code, code_challenge)" },
        { status: 400 }
      )
    }

    if (codeChallengeMethod !== "S256") {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Only code_challenge_method=S256 is supported" },
        { status: 400 }
      )
    }

    // Lazy imports to avoid module-level crash on Vercel
    const { validateClient, createAuthCode } = await import("@/lib/oauth")
    const { auth } = await import("@/lib/auth")
    const { default: dbClient, dbReady } = await import("@/lib/db")

    const valid = await validateClient(clientId, redirectUri)
    if (!valid) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Unknown client_id or redirect_uri mismatch" },
        { status: 400 }
      )
    }

    const session = await auth()
    if (!session?.user?.id) {
      const callbackUrl = url.toString()
      const loginUrl = new URL("/login", url.origin)
      loginUrl.searchParams.set("callbackUrl", callbackUrl)
      return Response.redirect(loginUrl.toString())
    }

    await dbReady
    const projectResult = await dbClient.execute({
      sql: "SELECT id FROM projects WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [session.user.id],
    })
    const projectId = projectResult.rows.length > 0
      ? (projectResult.rows[0].id as number)
      : null

    const code = await createAuthCode(
      clientId,
      session.user.id,
      redirectUri,
      codeChallenge,
      scope,
      projectId
    )

    const redirect = new URL(redirectUri)
    redirect.searchParams.set("code", code)
    if (state) redirect.searchParams.set("state", state)

    return Response.redirect(redirect.toString())
  } catch (e) {
    console.error("[OAuth] Authorize error:", e)
    return NextResponse.json(
      { error: "server_error", error_description: String(e) },
      { status: 500 }
    )
  }
}
