import client, { dbReady } from "./db"

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

/** Base64url encode (no padding) */
function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Generate a crypto-random ID with optional prefix */
export function generateId(prefix = ""): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const id = base64url(bytes.buffer)
  return prefix ? `${prefix}_${id}` : id
}

/** Register a dynamic OAuth client (RFC 7591) */
export async function registerClient(
  name: string,
  redirectUris: string[]
): Promise<{ client_id: string; client_secret: string }> {
  await dbReady
  const clientId = generateId("client")
  const clientSecret = generateId("secret")
  const secretHash = await sha256(clientSecret)

  await client.execute({
    sql: "INSERT INTO oauth_clients (id, secret_hash, name, redirect_uris) VALUES (?, ?, ?, ?)",
    args: [clientId, secretHash, name, JSON.stringify(redirectUris)],
  })

  return { client_id: clientId, client_secret: clientSecret }
}

/** Validate that a client_id exists and redirect_uri matches */
export async function validateClient(
  clientId: string,
  redirectUri: string
): Promise<boolean> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT redirect_uris FROM oauth_clients WHERE id = ?",
    args: [clientId],
  })
  if (result.rows.length === 0) return false
  const uris = JSON.parse(result.rows[0].redirect_uris as string) as string[]
  return uris.includes(redirectUri)
}

/** Create an authorization code (10-min expiry) */
export async function createAuthCode(
  clientId: string,
  userId: string,
  redirectUri: string,
  codeChallenge: string,
  scope: string | null,
  projectId: number | null
): Promise<string> {
  await dbReady
  const code = generateId()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await client.execute({
    sql: `INSERT INTO oauth_codes (code, client_id, user_id, project_id, redirect_uri, code_challenge, scope, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [code, clientId, userId, projectId, redirectUri, codeChallenge, scope, expiresAt],
  })

  return code
}

/** Verify PKCE S256: base64url(sha256(code_verifier)) === code_challenge */
async function verifyPkce(codeVerifier: string, codeChallenge: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier))
  const computed = base64url(hash)
  return computed === codeChallenge
}

/** Exchange an authorization code for an access token (atomic single-use) */
export async function exchangeCode(
  code: string,
  clientId: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; userId: string; projectId: number | null; scope: string | null } | null> {
  await dbReady

  // Atomic consume: UPDATE+RETURNING prevents TOCTOU race on concurrent requests
  const consumed = await client.execute({
    sql: "UPDATE oauth_codes SET used = 1 WHERE code = ? AND used = 0 AND expires_at > datetime('now') RETURNING *",
    args: [code],
  })
  if (consumed.rows.length === 0) return null

  const row = consumed.rows[0] as unknown as {
    code: string; client_id: string; user_id: string; project_id: number | null
    redirect_uri: string; code_challenge: string; scope: string | null
  }

  // Validate client_id and redirect_uri match
  if (row.client_id !== clientId) return null
  if (row.redirect_uri !== redirectUri) return null

  // PKCE S256 verification
  const pkceValid = await verifyPkce(codeVerifier, row.code_challenge)
  if (!pkceValid) return null

  // Create access token (1 hour expiry)
  const accessToken = generateId("mcp")
  const tokenHash = await sha256(accessToken)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await client.execute({
    sql: `INSERT INTO oauth_tokens (token_hash, client_id, user_id, project_id, scope, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [tokenHash, clientId, row.user_id, row.project_id, row.scope, expiresAt],
  })

  return {
    access_token: accessToken,
    userId: row.user_id,
    projectId: row.project_id,
    scope: row.scope,
  }
}

/** Validate a bearer token, return auth context */
export async function validateOAuthToken(
  bearerToken: string
): Promise<{ userId: string; projectId: number | null; scope: string | null } | null> {
  await dbReady
  const tokenHash = await sha256(bearerToken)

  const result = await client.execute({
    sql: "SELECT user_id, project_id, scope, expires_at FROM oauth_tokens WHERE token_hash = ?",
    args: [tokenHash],
  })

  if (result.rows.length === 0) return null

  const row = result.rows[0] as unknown as {
    user_id: string; project_id: number | null; scope: string | null; expires_at: string
  }

  if (new Date(row.expires_at) < new Date()) return null

  return { userId: row.user_id, projectId: row.project_id, scope: row.scope }
}
