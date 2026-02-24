"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import { createTask, updateTask, deleteTask, toggleTask, getTask, reorderTasks, moveTask, createProject, createComment } from "./data"
import { createApiKey, revokeApiKey } from "./api-auth"
import { emitTaskEvent } from "./emitter"
import type { ActionState, TaskStatus } from "./types"

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

async function getActor(): Promise<string> {
  const session = await auth()
  return session?.user?.name ?? "Someone"
}

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated")
  return session.user.id
}

function projectPaths(projectId: number) {
  return {
    tasks: `/projects/${projectId}/tasks`,
    board: `/projects/${projectId}/board`,
    task: (taskId: number) => `/projects/${projectId}/tasks/${taskId}`,
  }
}

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireUserId()
  const name = formData.get("name")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""

  if (!name) return { error: "Project name is required." }

  const result = await createProject({ name, description, owner_id: userId })
  const projectId = Number(result.lastInsertRowid)
  redirect(`/projects/${projectId}/tasks`)
}

export async function createTaskAction(
  projectId: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const priority = Number(formData.get("priority") ?? 0) as 0 | 1 | 2 | 3
  const due_date = formData.get("due_date")?.toString() || null

  if (!title) return { error: "Title is required." }

  const paths = projectPaths(projectId)
  const returnTo = formData.get("returnTo")?.toString()
  const safeReturnTo = returnTo === paths.board ? paths.board : paths.tasks
  const statusRaw = formData.get("status")?.toString()
  const status: TaskStatus = VALID_STATUSES.includes(statusRaw as TaskStatus) ? (statusRaw as TaskStatus) : "todo"

  const actor = await getActor()
  const result = await createTask({ title, description, priority, due_date, status, project_id: projectId })
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "created", taskId: Number(result.lastInsertRowid), taskTitle: title, actor })
  redirect(safeReturnTo)
}

export async function updateTaskAction(
  projectId: number,
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const completed = formData.get("completed") === "on" ? 1 : 0
  const priority = Number(formData.get("priority") ?? 0) as 0 | 1 | 2 | 3
  const due_date = formData.get("due_date")?.toString() || null

  if (!title) return { error: "Title is required." }

  const actor = await getActor()
  const paths = projectPaths(projectId)
  await updateTask(id, { title, description, completed: completed as 0 | 1, priority, due_date })
  revalidatePath(paths.tasks)
  revalidatePath(paths.task(id))
  emitTaskEvent({ type: "updated", taskId: id, taskTitle: title, actor })
  redirect(paths.task(id))
}

export async function deleteTaskAction(projectId: number, id: number): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  await deleteTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor })
  redirect(paths.tasks)
}

export async function toggleTaskAction(projectId: number, id: number): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  await toggleTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.task(id))
  revalidatePath(paths.tasks)
  emitTaskEvent({ type: "toggled", taskId: id, taskTitle, actor })
}

export async function deleteTaskListAction(projectId: number, id: number): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  await deleteTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor })
}

export async function reorderTasksAction(projectId: number, orderedIds: number[]): Promise<void> {
  await reorderTasks(orderedIds)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  const actor = await getActor()
  emitTaskEvent({ type: "reordered", taskId: 0, taskTitle: "", actor })
}

export async function moveTaskAction(
  projectId: number,
  id: number,
  status: TaskStatus,
  orderedColumnIds: number[]
): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const position = orderedColumnIds.indexOf(id)
  await moveTask(id, status, position)
  await reorderTasks(orderedColumnIds)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "moved", taskId: id, taskTitle: task?.title ?? "", actor })
}

// ── API Keys ────────────────────────────────────────────────────────────────

export async function createApiKeyAction(
  projectId: number,
  _prevState: ActionState & { generatedKey?: string },
  formData: FormData
): Promise<ActionState & { generatedKey?: string }> {
  await requireUserId()
  const name = formData.get("name")?.toString().trim() ?? ""
  if (!name) return { error: "Key name is required." }

  const { key } = await createApiKey(projectId, name)
  revalidatePath(`/projects/${projectId}/settings`)
  return { generatedKey: key }
}

export async function revokeApiKeyAction(projectId: number, keyId: number): Promise<void> {
  await requireUserId()
  await revokeApiKey(keyId, projectId)
  revalidatePath(`/projects/${projectId}/settings`)
}

// ── Comments ────────────────────────────────────────────────────────────────

export async function addCommentAction(
  projectId: number,
  taskId: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await getActor()
  const body = formData.get("body")?.toString().trim() ?? ""
  if (!body) return { error: "Comment cannot be empty." }

  await createComment({ task_id: taskId, author: actor, author_type: "human", body })
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`)
  return {}
}
