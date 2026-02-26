import { registerClient } from "@/lib/oauth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { client_name, redirect_uris, grant_types, response_types } = body

    if (!client_name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
      return Response.json(
        { error: "invalid_client_metadata", error_description: "client_name and redirect_uris are required" },
        { status: 400 }
      )
    }

    // Validate redirect_uris are valid URLs
    for (const uri of redirect_uris) {
      try { new URL(uri) } catch {
        return Response.json(
          { error: "invalid_client_metadata", error_description: `Invalid redirect_uri: ${uri}` },
          { status: 400 }
        )
      }
    }

    const { client_id, client_secret } = await registerClient(client_name, redirect_uris)

    return Response.json({
      client_id,
      client_secret,
      client_name,
      redirect_uris,
      grant_types: grant_types ?? ["authorization_code"],
      response_types: response_types ?? ["code"],
      token_endpoint_auth_method: "client_secret_post",
    }, { status: 201 })
  } catch (e) {
    console.error("[OAuth] Registration error:", e)
    return Response.json(
      { error: "server_error", error_description: "An internal error occurred" },
      { status: 500 }
    )
  }
}
