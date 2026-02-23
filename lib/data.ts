import db from "./db"
import type { Task, TaskStatus } from "./types"

export function getTasks(): Task[] {
  return db.prepare(
    "SELECT * FROM tasks ORDER BY position ASC, created_at DESC"
  ).all() as Task[]
}

export function getTasksPage(
  page: number,
  perPage: number,
  opts: { q?: string; priority?: number; sort?: string } = {}
): { tasks: Task[]; total: number } {
  const { q, priority, sort } = opts
  const offset = (page - 1) * perPage

  // Full-text search path
  if (q) {
    const safe = q.replace(/['"*]/g, " ").trim()
    if (safe) {
      const tasks = db.prepare(`
        SELECT tasks.* FROM tasks
        JOIN tasks_fts ON tasks.id = tasks_fts.rowid
        WHERE tasks_fts MATCH ?
        ORDER BY rank
      `).all(`${safe}*`) as Task[]
      return { tasks, total: tasks.length }
    }
  }

  const conditions: string[] = []
  const params: unknown[] = []

  if (priority !== undefined && priority > 0) {
    conditions.push("priority = ?")
    params.push(priority)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  let orderBy = "position ASC, created_at DESC"
  if (sort === "due") {
    orderBy = "CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, priority DESC"
  } else if (sort === "created") {
    orderBy = "created_at DESC"
  }

  const tasks = db
    .prepare(`SELECT * FROM tasks ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, perPage, offset) as Task[]

  const { total } = db
    .prepare(`SELECT COUNT(*) as total FROM tasks ${where}`)
    .get(...params) as { total: number }

  return { tasks, total }
}

export function searchTasks(q: string): Task[] {
  const safe = q.replace(/['"*]/g, " ").trim()
  if (!safe) return getTasks()
  return db.prepare(`
    SELECT tasks.* FROM tasks
    JOIN tasks_fts ON tasks.id = tasks_fts.rowid
    WHERE tasks_fts MATCH ?
    ORDER BY rank
  `).all(`${safe}*`) as Task[]
}

export function getTask(id: number): Task | undefined {
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined
}

export function createTask(data: { title: string; description: string; priority: number; due_date: string | null; status?: TaskStatus }) {
  const maxPos = (db.prepare("SELECT COALESCE(MAX(position), 0) as m FROM tasks").get() as { m: number }).m
  const status = data.status ?? "todo"
  return db
    .prepare("INSERT INTO tasks (title, description, priority, due_date, position, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run(data.title, data.description, data.priority, data.due_date, maxPos + 1, status)
}

export function updateTask(
  id: number,
  data: { title: string; description: string; completed: 0 | 1; priority: number; due_date: string | null }
) {
  return db
    .prepare(
      "UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ? WHERE id = ?"
    )
    .run(data.title, data.description, data.completed, data.priority, data.due_date, id)
}

export function deleteTask(id: number) {
  return db.prepare("DELETE FROM tasks WHERE id = ?").run(id)
}

export function toggleTask(id: number) {
  return db
    .prepare("UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?")
    .run(id)
}

export function getTasksBoard(): Record<TaskStatus, Task[]> {
  const tasks = db.prepare(
    "SELECT * FROM tasks ORDER BY position ASC, created_at DESC"
  ).all() as Task[]
  return {
    todo:        tasks.filter(t => t.status === "todo"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    done:        tasks.filter(t => t.status === "done"),
  }
}

export function moveTask(id: number, status: TaskStatus, position: number): void {
  db.prepare(
    "UPDATE tasks SET status = ?, position = ?, completed = ? WHERE id = ?"
  ).run(status, position, status === "done" ? 1 : 0, id)
}

export function reorderTasks(orderedIds: number[]): void {
  const update = db.prepare("UPDATE tasks SET position = ? WHERE id = ?")
  const runMany = db.transaction((ids: number[]) => {
    ids.forEach((id, index) => update.run(index, id))
  })
  runMany(orderedIds)
}
