import { createClient } from "@libsql/client"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:tasks.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
})

async function initDb() {
  // Users table (GitHub OAuth)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Projects table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      owner_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // API keys table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT
    )
  `)

  // Comments table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      author_type TEXT NOT NULL DEFAULT 'human',
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Tasks table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Schema migrations — idempotent via try/catch
  const migrations = [
    `ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE tasks ADD COLUMN due_date TEXT`,
    `ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'`,
    `ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)`,
    `ALTER TABLE tasks ADD COLUMN claimed_by TEXT`,
  ]
  for (const sql of migrations) {
    try { await client.execute(sql) } catch {}
  }

  // Backfills
  await client.execute(`UPDATE tasks SET position = id WHERE position = 0`)
  await client.execute(`UPDATE tasks SET status = 'done' WHERE completed = 1 AND status = 'todo'`)

  // Indexes
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_project_position ON tasks(project_id, position)`,
    `CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id)`,
    `CREATE INDEX IF NOT EXISTS idx_api_keys_project ON api_keys(project_id)`,
    `CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`,
  ]
  for (const sql of indexes) {
    try { await client.execute(sql) } catch {}
  }

  // FTS5 virtual table for full-text search
  await client.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
      title,
      description,
      content=tasks,
      content_rowid=id
    )
  `)

  // Sync existing rows into FTS if empty
  const ftsResult = await client.execute("SELECT COUNT(*) as n FROM tasks_fts")
  const ftsCount = ftsResult.rows[0][0] as number
  if (ftsCount === 0) {
    await client.execute("INSERT INTO tasks_fts(rowid, title, description) SELECT id, title, description FROM tasks")
  }

  // Triggers to keep FTS in sync — IF NOT EXISTS makes these idempotent
  try {
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
        INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
      END
    `)
  } catch {}
  try {
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
        INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
      END
    `)
  } catch {}
  try {
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks
      WHEN old.title != new.title OR old.description != new.description BEGIN
        INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
        INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
      END
    `)
  } catch {}
}

export const dbReady = initDb()
export default client
