import db from "./db"
import type { Task } from "./types"

export function getTasks(): Task[] {
  return db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all() as Task[]
}

export function getTasksPage(
  page: number,
  perPage: number
): { tasks: Task[]; total: number } {
  const offset = (page - 1) * perPage
  const tasks = db
    .prepare("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(perPage, offset) as Task[]
  const { total } = db
    .prepare("SELECT COUNT(*) as total FROM tasks")
    .get() as { total: number }
  return { tasks, total }
}

export function getTask(id: number): Task | undefined {
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined
}

export function createTask(data: { title: string; description: string }) {
  return db
    .prepare("INSERT INTO tasks (title, description) VALUES (?, ?)")
    .run(data.title, data.description)
}

export function updateTask(
  id: number,
  data: { title: string; description: string; completed: 0 | 1 }
) {
  return db
    .prepare(
      "UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?"
    )
    .run(data.title, data.description, data.completed, id)
}

export function deleteTask(id: number) {
  return db.prepare("DELETE FROM tasks WHERE id = ?").run(id)
}

export function toggleTask(id: number) {
  return db
    .prepare("UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?")
    .run(id)
}
