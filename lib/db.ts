import Database from "better-sqlite3"
import path from "path"

const db = new Database(path.join(process.cwd(), "tasks.db"))

db.pragma("journal_mode = WAL")

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

// Schema migrations — idempotent via try/catch (SQLite has no ADD COLUMN IF NOT EXISTS)
try { db.exec(`ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`) } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN due_date TEXT`) } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0`) } catch {}
try { db.exec(`ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'todo'`) } catch {}

// Backfill position for existing rows
db.exec(`UPDATE tasks SET position = id WHERE position = 0`)
db.exec(`UPDATE tasks SET status = 'done' WHERE completed = 1 AND status = 'todo'`)

// FTS5 virtual table for full-text search
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
    title,
    description,
    content=tasks,
    content_rowid=id
  )
`)

// Sync existing rows into FTS if empty
const ftsCount = (db.prepare("SELECT COUNT(*) as n FROM tasks_fts").get() as { n: number }).n
if (ftsCount === 0) {
  db.exec("INSERT INTO tasks_fts(rowid, title, description) SELECT id, title, description FROM tasks")
}

// Triggers to keep FTS in sync — drop & recreate so WHEN clause is always current
db.exec(`
  DROP TRIGGER IF EXISTS tasks_ai;
  DROP TRIGGER IF EXISTS tasks_ad;
  DROP TRIGGER IF EXISTS tasks_au;

  CREATE TRIGGER tasks_ai AFTER INSERT ON tasks BEGIN
    INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
  END;
  CREATE TRIGGER tasks_ad AFTER DELETE ON tasks BEGIN
    INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
  END;
  -- Only sync FTS when searchable text actually changes (not on position/priority/due_date/completed updates)
  CREATE TRIGGER tasks_au AFTER UPDATE ON tasks
  WHEN old.title != new.title OR old.description != new.description BEGIN
    INSERT INTO tasks_fts(tasks_fts, rowid, title, description) VALUES('delete', old.id, old.title, old.description);
    INSERT INTO tasks_fts(rowid, title, description) VALUES (new.id, new.title, new.description);
  END;
`)

const count = (db.prepare("SELECT COUNT(*) as n FROM tasks").get() as { n: number }).n
if (count === 0) {
  db.prepare(
    "INSERT INTO tasks (title, description) VALUES (?, ?)"
  ).run("Buy groceries", "Milk, eggs, bread")
  db.prepare(
    "INSERT INTO tasks (title, description) VALUES (?, ?)"
  ).run("Read a book", "Finish the current chapter")
}

export default db
