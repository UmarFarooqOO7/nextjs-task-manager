import client, { dbReady } from "./db"
import type { InValue } from "@libsql/client"
import type { Task, TaskStatus, Project, Comment, Label, TaskWithLabels } from "./types"

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

export async function updateProject(id: number, data: { name?: string; description?: string }) {
  await dbReady
  const sets: string[] = []
  const args: (string | number)[] = []
  if (data.name !== undefined) { sets.push("name = ?"); args.push(data.name) }
  if (data.description !== undefined) { sets.push("description = ?"); args.push(data.description) }
  if (sets.length === 0) return
  args.push(id)
  return client.execute({
    sql: `UPDATE projects SET ${sets.join(", ")} WHERE id = ?`,
    args,
  })
}

export async function getProjectStats(projectId: number) {
  await dbReady
  const result = await client.execute({
    sql: `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
    FROM tasks WHERE project_id = ?`,
    args: [projectId],
  })
  const row = result.rows[0] as unknown as { total: number; todo: number; in_progress: number; done: number }
  return { total: row.total ?? 0, todo: row.todo ?? 0, in_progress: row.in_progress ?? 0, done: row.done ?? 0 }
}

export async function getActiveAgents(projectId: number) {
  await dbReady
  const result = await client.execute({
    sql: `SELECT name, key_prefix, last_used_at FROM api_keys
          WHERE project_id = ? AND last_used_at IS NOT NULL
          ORDER BY last_used_at DESC LIMIT 5`,
    args: [projectId],
  })
  return result.rows as unknown as { name: string; key_prefix: string; last_used_at: string }[]
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
  assignee?: string | null
}) {
  await dbReady
  const status = data.status ?? "todo"
  return client.execute({
    sql: `INSERT INTO tasks (title, description, priority, due_date, position, status, project_id, assignee)
          VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE project_id = ?), ?, ?, ?)`,
    args: [data.title, data.description, data.priority, data.due_date, data.project_id, status, data.project_id, data.assignee ?? null],
  })
}

export async function updateTask(
  id: number,
  data: { title: string; description: string; completed: 0 | 1; priority: number; due_date: string | null; assignee?: string | null }
) {
  await dbReady
  return client.execute({
    sql: "UPDATE tasks SET title = ?, description = ?, completed = ?, priority = ?, due_date = ?, assignee = ? WHERE id = ?",
    args: [data.title, data.description, data.completed, data.priority, data.due_date, data.assignee ?? null, id],
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

export async function getTasksBoard(projectId: number): Promise<Record<TaskStatus, TaskWithLabels[]>> {
  await dbReady
  const [tasksResult, labelsResult] = await client.batch([
    {
      sql: "SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC, created_at DESC",
      args: [projectId],
    },
    {
      sql: `SELECT tl.task_id, l.id, l.project_id, l.name, l.color, l.created_at
            FROM task_labels tl
            JOIN labels l ON l.id = tl.label_id
            WHERE l.project_id = ?`,
      args: [projectId],
    },
  ], "read")

  const tasks = tasksResult.rows as unknown as Task[]
  const labelRows = labelsResult.rows as unknown as (Label & { task_id: number })[]

  // Group labels by task_id
  const labelsByTask = new Map<number, Label[]>()
  for (const row of labelRows) {
    const existing = labelsByTask.get(row.task_id) ?? []
    existing.push({ id: row.id, project_id: row.project_id, name: row.name, color: row.color, created_at: row.created_at })
    labelsByTask.set(row.task_id, existing)
  }

  const tasksWithLabels: TaskWithLabels[] = tasks.map(t => ({
    ...t,
    labels: labelsByTask.get(t.id) ?? [],
  }))

  return {
    todo:        tasksWithLabels.filter(t => t.status === "todo"),
    in_progress: tasksWithLabels.filter(t => t.status === "in_progress"),
    done:        tasksWithLabels.filter(t => t.status === "done"),
  }
}

export async function moveTask(id: number, status: TaskStatus, position: number): Promise<void> {
  await dbReady
  await client.execute({
    sql: "UPDATE tasks SET status = ?, position = ?, completed = ? WHERE id = ?",
    args: [status, position, status === "done" ? 1 : 0, id],
  })
}

export async function reorderTasks(orderedIds: number[], projectId?: number): Promise<void> {
  await dbReady
  await client.batch(
    orderedIds.map((id, i) => ({
      sql: projectId
        ? "UPDATE tasks SET position = ? WHERE id = ? AND project_id = ?"
        : "UPDATE tasks SET position = ? WHERE id = ?",
      args: projectId ? [i, id, projectId] : [i, id],
    })),
    "write"
  )
}

export async function claimTask(id: number, claimedBy: string | null): Promise<void> {
  await dbReady
  await client.execute({
    sql: "UPDATE tasks SET claimed_by = ? WHERE id = ?",
    args: [claimedBy, id],
  })
}

export async function assignTask(id: number, assignee: string | null): Promise<void> {
  await dbReady
  await client.execute({
    sql: "UPDATE tasks SET assignee = ? WHERE id = ?",
    args: [assignee, id],
  })
}

// ── Labels ──────────────────────────────────────────────────────────────────

export async function getLabels(projectId: number): Promise<Label[]> {
  await dbReady
  const result = await client.execute({
    sql: "SELECT * FROM labels WHERE project_id = ? ORDER BY name ASC",
    args: [projectId],
  })
  return result.rows as unknown as Label[]
}

export async function createLabel(data: { project_id: number; name: string; color: string }): Promise<Label> {
  await dbReady
  const result = await client.execute({
    sql: "INSERT INTO labels (project_id, name, color) VALUES (?, ?, ?) RETURNING *",
    args: [data.project_id, data.name, data.color],
  })
  return result.rows[0] as unknown as Label
}

export async function updateLabel(id: number, data: { name: string; color: string }): Promise<void> {
  await dbReady
  await client.execute({
    sql: "UPDATE labels SET name = ?, color = ? WHERE id = ?",
    args: [data.name, data.color, id],
  })
}

export async function deleteLabel(id: number): Promise<void> {
  await dbReady
  await client.execute({ sql: "DELETE FROM labels WHERE id = ?", args: [id] })
}

export async function getTaskLabels(taskId: number): Promise<Label[]> {
  await dbReady
  const result = await client.execute({
    sql: `SELECT l.* FROM labels l
          JOIN task_labels tl ON tl.label_id = l.id
          WHERE tl.task_id = ?
          ORDER BY l.name ASC`,
    args: [taskId],
  })
  return result.rows as unknown as Label[]
}

export async function setTaskLabels(taskId: number, labelIds: number[]): Promise<void> {
  await dbReady
  const stmts = [
    { sql: "DELETE FROM task_labels WHERE task_id = ?", args: [taskId] as InValue[] },
    ...labelIds.map(lid => ({
      sql: "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)",
      args: [taskId, lid] as InValue[],
    })),
  ]
  await client.batch(stmts, "write")
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
