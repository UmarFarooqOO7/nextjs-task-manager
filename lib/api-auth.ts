import client, { dbReady } from "./db"
import type { ApiKey } from "./types"

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

function generateKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const chars = Array.from(bytes)
    .map(b => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32)
  return `tm_${chars}`
}

export async function createApiKey(projectId: number, name: string): Promise<{ key: string; prefix: string }> {
  await dbReady
  const key = generateKey()
  const keyHash = await sha256(key)
  const keyPrefix = key.slice(0, 11) // "tm_" + 8 chars

  await client.execute({
    sql: "INSERT INTO api_keys (project_id, name, key_hash, key_prefix) VALUES (?, ?, ?, ?)",
    args: [projectId, name, keyHash, keyPrefix],
  })

  return { key, prefix: keyPrefix }
}

export async function listApiKeys(projectId: number): Promise<ApiKey[]> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM api_keys WHERE project_id = ? ORDER BY created_at DESC",
    args: [projectId],
  })
  return result.rows as unknown as ApiKey[]
}

export async function revokeApiKey(id: number, projectId: number): Promise<void> {
  await dbReady
  await client.execute({
    sql: "DELETE FROM api_keys WHERE id = ? AND project_id = ?",
    args: [id, projectId],
  })
}

export async function validateApiKey(
  authHeader: string | null
): Promise<{ projectId: number; agentName: string } | null> {
  if (!authHeader?.startsWith("Bearer tm_")) return null
  const key = authHeader.slice(7) // remove "Bearer "

  await dbReady
  const keyHash = await sha256(key)

  const result = await client.execute({
    sql: "UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ? RETURNING project_id, name",
    args: [keyHash],
  })

  if (result.rows.length === 0) return null

  const row = result.rows[0] as unknown as { project_id: number; name: string }
  return { projectId: row.project_id, agentName: row.name }
}
