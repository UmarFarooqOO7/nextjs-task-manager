import client, { dbReady } from "./db"
import type { InValue } from "@libsql/client"
import type { Task, TaskStatus, Project, Comment } from "./types"

// ── Projects ────────────────────────────────────────────────────────────────

export async function getProjectsByOwner(ownerId: string): Promise<Project[]> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC",
    args: [ownerId],
  })
  return result.rows as unknown as Project[]
}

export async function getProject(id: number): Promise<Project | undefined> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM projects WHERE id = ?",
    args: [id],
  })
  return result.rows[0] as unknown as Project | undefined
}

export async function createProject(data: { name: string; description: string; owner_id: string }) {
  await dbReady
  return client.execute({
    sql: "INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)",
    args: [data.name, data.description, data.owner_id],
  })
}

// ── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasks(projectId: number): Promise<Task[]> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC, created_at DESC",
    args: [projectId],
  })
  return result.rows as unknown as Task[]
}

export async function getTasksPage(
  projectId: number,
  page: number,
  perPage: number,
  opts: { q?: string; priority?: number; sort?: string } = {}
): Promise<{ tasks: Task[]; total: number }> {
  await dbReady
  const { q, priority, sort } = opts
  const offset = (page - 1) * perPage

  // Full-text search path
  if (q) {
    const safe = q.replace(/['"*]/g, " ").trim()
    if (safe) {
      const result = await client.execute({
        sql: `
          SELECT tasks.* FROM tasks
          JOIN tasks_fts ON tasks.id = tasks_fts.rowid
          WHERE tasks_fts MATCH ? AND tasks.project_id = ?
          ORDER BY rank
        `,
        args: [`${safe}*`, projectId],
      })
      const tasks = result.rows as unknown as Task[]
      return { tasks, total: tasks.length }
    }
  }

  const conditions: string[] = ["project_id = ?"]
  const params: InValue[] = [projectId]

  if (priority !== undefined && priority > 0) {
    conditions.push("priority = ?")
    params.push(priority)
  }

  const where = `WHERE ${conditions.join(" AND ")}`

  let orderBy = "position ASC, created_at DESC"
  if (sort === "due") {
    orderBy = "CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, priority DESC"
  } else if (sort === "created") {
    orderBy = "created_at DESC"
  }

  const tasksResult = await client.execute({
    sql: `SELECT * FROM tasks ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    args: [...params, perPage, offset],
  })

  const totalResult = await client.execute({
    sql: `SELECT COUNT(*) as total FROM tasks ${where}`,
    args: params,
  })

  return {
    tasks: tasksResult.rows as unknown as Task[],
    total: totalResult.rows[0][0] as number,
  }
}

export async function searchTasks(projectId: number, q: string): Promise<Task[]> {
  await dbReady
  const safe = q.replace(/['"*]/g, " ").trim()
  if (!safe) return getTasks(projectId)
  const result = await client.execute({
    sql: `
      SELECT tasks.* FROM tasks
      JOIN tasks_fts ON tasks.id = tasks_fts.rowid
      WHERE tasks_fts MATCH ? AND tasks.project_id = ?
      ORDER BY rank
    `,
    args: [`${safe}*`, projectId],
  })
  return result.rows as unknown as Task[]
}

export async function getTask(id: number): Promise<Task | undefined> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM tasks WHERE id = ?",
    args: [id],
  })
  return result.rows[0] as unknown as Task | undefined
}

export async function createTask(data: {
  title: string
  description: string
  priority: number
  due_date: string | null
  status?: TaskStatus
  project_id: number
}) {
  await dbReady
  const status = data.status ?? "todo"
  const maxResult = await client.execute({
    sql: "SELECT COALESCE(MAX(position), 0) as m FROM tasks WHERE project_id = ?",
    args: [data.project_id],
  })
  const maxPos = maxResult.rows[0][0] as number
  return client.execute({
    sql: "INSERT INTO tasks (title, description, priority, due_date, position, status, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [data.title, data.description, data.priority, data.due_date, maxPos + 1, status, data.project_id],
  })
}

export async function updateTask(
  id: number,
  data: { title: string; description: string; completed: 0 | 1; priority: number; due_date: string | null }
) {
  await dbReady
  return client.execute({
    sql: "UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ? WHERE id = ?",
    args: [data.title, data.description, data.completed, data.priority, data.due_date, id],
  })
}

export async function deleteTask(id: number) {
  await dbReady
  return client.execute({ sql: "DELETE FROM tasks WHERE id = ?", args: [id] })
}

export async function toggleTask(id: number) {
  await dbReady
  return client.execute({
    sql: "UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?",
    args: [id],
  })
}

export async function getTasksBoard(projectId: number): Promise<Record<TaskStatus, Task[]>> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC, created_at DESC",
    args: [projectId],
  })
  const tasks = result.rows as unknown as Task[]
  return {
    todo:        tasks.filter(t => t.status === "todo"),
    in_progress: tasks.filter(t => t.status === "in_progress"),
    done:        tasks.filter(t => t.status === "done"),
  }
}

export async function moveTask(id: number, status: TaskStatus, position: number): Promise<void> {
  await dbReady
  await client.execute({
    sql: "UPDATE tasks SET status = ?, position = ?, completed = ? WHERE id = ?",
    args: [status, position, status === "done" ? 1 : 0, id],
  })
}

export async function reorderTasks(orderedIds: number[]): Promise<void> {
  await dbReady
  await client.batch(
    orderedIds.map((id, i) => ({
      sql: "UPDATE tasks SET position = ? WHERE id = ?",
      args: [i, id],
    })),
    "write"
  )
}

// ── Comments ────────────────────────────────────────────────────────────────

export async function getComments(taskId: number): Promise<Comment[]> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC",
    args: [taskId],
  })
  return result.rows as unknown as Comment[]
}

export async function createComment(data: {
  task_id: number
  author: string
  author_type: "human" | "agent"
  body: string
}) {
  await dbReady
  return client.execute({
    sql: "INSERT INTO comments (task_id, author, author_type, body) VALUES (?, ?, ?, ?)",
    args: [data.task_id, data.author, data.author_type, data.body],
  })
}
