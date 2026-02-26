import { auth } from "@/lib/auth"
import { validateClient, createAuthCode } from "@/lib/oauth"
import client, { dbReady } from "@/lib/db"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const clientId = url.searchParams.get("client_id")
  const redirectUri = url.searchParams.get("redirect_uri")
  const responseType = url.searchParams.get("response_type")
  const codeChallenge = url.searchParams.get("code_challenge")
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "S256"
  const state = url.searchParams.get("state")
  const scope = url.searchParams.get("scope")

  // Validate required params
  if (!clientId || !redirectUri || responseType !== "code" || !codeChallenge) {
    return Response.json(
      { error: "invalid_request", error_description: "Missing required parameters (client_id, redirect_uri, response_type=code, code_challenge)" },
      { status: 400 }
    )
  }

  // OAuth 2.1 requires S256 — reject plain or unknown methods
  if (codeChallengeMethod !== "S256") {
    return Response.json(
      { error: "invalid_request", error_description: "Only code_challenge_method=S256 is supported" },
      { status: 400 }
    )
  }

  // Validate client
  const valid = await validateClient(clientId, redirectUri)
  if (!valid) {
    return Response.json(
      { error: "invalid_client", error_description: "Unknown client_id or redirect_uri mismatch" },
      { status: 400 }
    )
  }

  // Check Auth.js session
  const session = await auth()
  if (!session?.user?.id) {
    // Redirect to login, then come back here
    const callbackUrl = url.toString()
    const loginUrl = new URL("/login", url.origin)
    loginUrl.searchParams.set("callbackUrl", callbackUrl)
    return Response.redirect(loginUrl.toString())
  }

  // Auto-select the user's first project
  await dbReady
  const projectResult = await client.execute({
    sql: "SELECT id FROM projects WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [session.user.id],
  })
  const projectId = projectResult.rows.length > 0
    ? (projectResult.rows[0].id as number)
    : null

  // Generate authorization code
  const code = await createAuthCode(
    clientId,
    session.user.id,
    redirectUri,
    codeChallenge,
    scope,
    projectId
  )

  // Redirect back to client with code
  const redirect = new URL(redirectUri)
  redirect.searchParams.set("code", code)
  if (state) redirect.searchParams.set("state", state)

  return Response.redirect(redirect.toString())
}
