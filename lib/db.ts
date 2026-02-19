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
