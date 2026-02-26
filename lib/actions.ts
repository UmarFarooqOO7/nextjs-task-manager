"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth } from "./auth"
import { createTask, updateTask, deleteTask, toggleTask, getTask, reorderTasks, moveTask, createProject, createComment, getComments, getProject, createLabel, updateLabel, deleteLabel, setTaskLabels, assignTask, getLabels } from "./data"
import { createApiKey, revokeApiKey } from "./api-auth"
import { emitTaskEvent } from "./emitter"
import type { ActionState, TaskStatus } from "./types"

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const statusSchema = z.enum(["todo", "in_progress", "done"])
const prioritySchema = z.coerce.number().int().min(0).max(3).default(0)

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().default(""),
  priority: prioritySchema,
  due_date: z.string().nullable().default(null),
  status: statusSchema.default("todo"),
  assignee: z.string().nullable().default(null),
  labelIds: z.string().default(""),
  returnTo: z.string().optional(),
})

const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().default(""),
  completed: z.boolean().default(false),
  priority: prioritySchema,
  due_date: z.string().nullable().default(null),
  assignee: z.string().nullable().default(null),
  labelIds: z.string().optional(),
})

const inlineTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().default(""),
  priority: z.number().int().min(0).max(3).default(0),
  due_date: z.string().nullable().default(null),
  status: statusSchema.default("todo"),
  assignee: z.string().nullable().default(null),
  labelIds: z.array(z.number().int()).default([]),
})

async function validateLabelIds(projectId: number, labelIds: number[]): Promise<number[]> {
  if (labelIds.length === 0) return []
  const projectLabels = await getLabels(projectId)
  const valid = new Set(projectLabels.map(l => l.id))
  return labelIds.filter(id => valid.has(id))
}

async function getActor(): Promise<string> {
  const session = await auth()
  return session?.user?.name ?? "Someone"
}

async function requireUserId(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Not authenticated")
  return session.user.id
}

async function requireProjectAccess(projectId: number): Promise<string> {
  const userId = await requireUserId()
  const project = await getProject(projectId)
  if (!project || project.owner_id !== userId) throw new Error("Access denied")
  return userId
}

async function requireTaskInProject(taskId: number, projectId: number) {
  const task = await getTask(taskId)
  if (!task || task.project_id !== projectId) throw new Error("Task not found")
  return task
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
  const parsed = z.object({
    name: z.string().trim().min(1, "Project name is required."),
    description: z.string().trim().default(""),
  }).safeParse({
    name: formData.get("name")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const result = await createProject({ ...parsed.data, owner_id: userId })
  const projectId = Number(result.lastInsertRowid)
  redirect(`/projects/${projectId}/board`)
}

export async function createTaskAction(
  projectId: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireProjectAccess(projectId)

  const parsed = createTaskSchema.safeParse({
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    priority: formData.get("priority")?.toString() ?? "0",
    due_date: formData.get("due_date")?.toString() || null,
    status: formData.get("status")?.toString() ?? "todo",
    assignee: formData.get("assignee")?.toString() || null,
    labelIds: formData.get("labelIds")?.toString() ?? "",
    returnTo: formData.get("returnTo")?.toString(),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { title, description, priority, due_date, status, assignee, labelIds: labelIdsRaw, returnTo } = parsed.data

  const paths = projectPaths(projectId)
  const safeReturnTo = returnTo === paths.tasks ? paths.tasks : paths.board

  const actor = await getActor()
  const result = await createTask({ title, description, priority, due_date, status, project_id: projectId, assignee })
  const newTaskId = Number(result.lastInsertRowid)

  if (labelIdsRaw) {
    const labelIds = await validateLabelIds(projectId, labelIdsRaw.split(",").map(Number).filter(Boolean))
    if (labelIds.length > 0) await setTaskLabels(newTaskId, labelIds)
  }

  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "created", taskId: newTaskId, taskTitle: title, actor, projectId })
  redirect(safeReturnTo)
}

export async function createTaskInlineAction(
  projectId: number,
  data: {
    title: string
    description: string
    priority: number
    due_date: string | null
    status: TaskStatus
    assignee: string | null
    labelIds: number[]
  }
): Promise<{ success: boolean; error?: string }> {
  await requireProjectAccess(projectId)

  const parsed = inlineTaskSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const actor = await getActor()
  const result = await createTask({
    title: data.title.trim(),
    description: data.description.trim(),
    priority: data.priority,
    due_date: data.due_date,
    status: data.status,
    project_id: projectId,
    assignee: data.assignee,
  })
  const newTaskId = Number(result.lastInsertRowid)

  const validLabelIds = await validateLabelIds(projectId, data.labelIds)
  if (validLabelIds.length > 0) {
    await setTaskLabels(newTaskId, validLabelIds)
  }

  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "created", taskId: newTaskId, taskTitle: data.title, actor, projectId })
  return { success: true }
}

export async function updateTaskAction(
  projectId: number,
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireProjectAccess(projectId)
  await requireTaskInProject(id, projectId)

  const parsed = updateTaskSchema.safeParse({
    title: formData.get("title")?.toString() ?? "",
    description: formData.get("description")?.toString() ?? "",
    completed: formData.get("completed") === "on",
    priority: formData.get("priority")?.toString() ?? "0",
    due_date: formData.get("due_date")?.toString() || null,
    assignee: formData.get("assignee")?.toString() || null,
    labelIds: formData.get("labelIds")?.toString(),
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { title, description, completed, priority, due_date, assignee, labelIds: labelIdsRaw } = parsed.data

  const actor = await getActor()
  const paths = projectPaths(projectId)
  await updateTask(id, { title, description, completed: (completed ? 1 : 0) as 0 | 1, priority, due_date, assignee })

  if (labelIdsRaw !== undefined) {
    const labelIds = await validateLabelIds(projectId, labelIdsRaw ? labelIdsRaw.split(",").map(Number).filter(Boolean) : [])
    await setTaskLabels(id, labelIds)
  }

  revalidatePath(paths.tasks)
  revalidatePath(paths.task(id))
  revalidatePath(paths.board)
  emitTaskEvent({ type: "updated", taskId: id, taskTitle: title, actor, projectId })
  redirect(paths.task(id))
}

export async function updateTaskInlineAction(
  projectId: number,
  taskId: number,
  data: {
    title: string
    description: string
    priority: number
    due_date: string | null
    status: TaskStatus
    assignee: string | null
    labelIds: number[]
  }
): Promise<{ success: boolean; error?: string }> {
  await requireProjectAccess(projectId)
  await requireTaskInProject(taskId, projectId)

  const parsed = inlineTaskSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const actor = await getActor()
  const completed = parsed.data.status === "done" ? 1 : 0
  await updateTask(taskId, {
    title: data.title.trim(),
    description: data.description.trim(),
    completed: completed as 0 | 1,
    priority: data.priority,
    due_date: data.due_date,
    assignee: data.assignee,
  })

  // Update status separately if needed
  const task = await getTask(taskId)
  if (task && task.status !== data.status) {
    await moveTask(taskId, data.status, task.position)
  }

  const validLabelIds = await validateLabelIds(projectId, data.labelIds)
  await setTaskLabels(taskId, validLabelIds)

  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.task(taskId))
  revalidatePath(paths.board)
  emitTaskEvent({ type: "updated", taskId, taskTitle: data.title, actor, projectId })
  return { success: true }
}

export async function deleteTaskAction(projectId: number, id: number): Promise<void> {
  await requireProjectAccess(projectId)
  const actor = await getActor()
  const task = await requireTaskInProject(id, projectId)
  await deleteTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle: task.title, actor, projectId })
  redirect(paths.board)
}

export async function toggleTaskAction(projectId: number, id: number): Promise<void> {
  await requireProjectAccess(projectId)
  const actor = await getActor()
  const task = await requireTaskInProject(id, projectId)
  await toggleTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.task(id))
  revalidatePath(paths.board)
  emitTaskEvent({ type: "toggled", taskId: id, taskTitle: task.title, actor, projectId })
}

export async function deleteTaskInlineAction(projectId: number, id: number): Promise<{ success: boolean }> {
  await requireProjectAccess(projectId)
  const actor = await getActor()
  const task = await requireTaskInProject(id, projectId)
  const taskTitle = task.title
  await deleteTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor, projectId })
  return { success: true }
}

export async function moveTaskAction(
  projectId: number,
  id: number,
  status: TaskStatus,
  orderedColumnIds: number[]
): Promise<void> {
  await requireProjectAccess(projectId)
  const actor = await getActor()
  const task = await requireTaskInProject(id, projectId)
  const position = orderedColumnIds.indexOf(id)
  await moveTask(id, status, position)
  await reorderTasks(orderedColumnIds, projectId)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "moved", taskId: id, taskTitle: task?.title ?? "", actor, projectId })
}

// ── Labels ────────────────────────────────────────────────────────────────

export async function createLabelAction(
  projectId: number,
  data: { name: string; color: string }
): Promise<{ success: boolean; error?: string }> {
  await requireProjectAccess(projectId)
  if (!data.name.trim()) return { success: false, error: "Label name is required." }
  await createLabel({ project_id: projectId, name: data.name.trim(), color: data.color })
  revalidatePath(`/projects/${projectId}/settings`)
  revalidatePath(`/projects/${projectId}/board`)
  return { success: true }
}

export async function updateLabelAction(
  projectId: number,
  labelId: number,
  data: { name: string; color: string }
): Promise<{ success: boolean; error?: string }> {
  await requireProjectAccess(projectId)
  if (!data.name.trim()) return { success: false, error: "Label name is required." }
  await updateLabel(labelId, { name: data.name.trim(), color: data.color })
  revalidatePath(`/projects/${projectId}/settings`)
  revalidatePath(`/projects/${projectId}/board`)
  return { success: true }
}

export async function deleteLabelAction(
  projectId: number,
  labelId: number
): Promise<{ success: boolean }> {
  await requireProjectAccess(projectId)
  await deleteLabel(labelId)
  revalidatePath(`/projects/${projectId}/settings`)
  revalidatePath(`/projects/${projectId}/board`)
  return { success: true }
}

export async function setTaskLabelsAction(
  projectId: number,
  taskId: number,
  labelIds: number[]
): Promise<{ success: boolean }> {
  await requireProjectAccess(projectId)
  await requireTaskInProject(taskId, projectId)
  const validLabelIds = await validateLabelIds(projectId, labelIds)
  await setTaskLabels(taskId, validLabelIds)
  const paths = projectPaths(projectId)
  revalidatePath(paths.board)
  revalidatePath(paths.task(taskId))
  return { success: true }
}

export async function assignTaskAction(
  projectId: number,
  taskId: number,
  assigneeName: string | null
): Promise<{ success: boolean }> {
  await requireProjectAccess(projectId)
  await requireTaskInProject(taskId, projectId)
  await assignTask(taskId, assigneeName)
  const paths = projectPaths(projectId)
  revalidatePath(paths.board)
  revalidatePath(paths.task(taskId))
  return { success: true }
}

// ── API Keys ────────────────────────────────────────────────────────────────

export async function createApiKeyAction(
  projectId: number,
  _prevState: ActionState & { generatedKey?: string },
  formData: FormData
): Promise<ActionState & { generatedKey?: string }> {
  await requireProjectAccess(projectId)
  const parsed = z.object({ name: z.string().trim().min(1, "Key name is required.") })
    .safeParse({ name: formData.get("name")?.toString() ?? "" })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { name } = parsed.data

  const { key } = await createApiKey(projectId, name)
  revalidatePath(`/projects/${projectId}/settings`)
  return { generatedKey: key }
}

export async function revokeApiKeyAction(projectId: number, keyId: number): Promise<void> {
  await requireProjectAccess(projectId)
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
  await requireProjectAccess(projectId)
  await requireTaskInProject(taskId, projectId)
  const actor = await getActor()
  const parsed = z.object({ body: z.string().trim().min(1, "Comment cannot be empty.") })
    .safeParse({ body: formData.get("body")?.toString() ?? "" })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { body } = parsed.data

  await createComment({ task_id: taskId, author: actor, author_type: "human", body })
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`)
  return {}
}

export async function addCommentInlineAction(
  projectId: number,
  taskId: number,
  body: string
): Promise<{ success: boolean; error?: string }> {
  await requireProjectAccess(projectId)
  await requireTaskInProject(taskId, projectId)
  const trimmed = body.trim()
  if (!trimmed) return { success: false, error: "Comment cannot be empty." }

  const actor = await getActor()
  await createComment({ task_id: taskId, author: actor, author_type: "human", body: trimmed })
  const paths = projectPaths(projectId)
  revalidatePath(paths.board)
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`)
  emitTaskEvent({ type: "updated", taskId, taskTitle: "", actor, projectId })
  return { success: true }
}

export async function getCommentsAction(
  projectId: number,
  taskId: number
): Promise<{ id: number; author: string; author_type: string; body: string; created_at: string }[]> {
  await requireProjectAccess(projectId)
  await requireTaskInProject(taskId, projectId)
  const comments = await getComments(taskId)
  return comments.map(c => ({ id: c.id, author: c.author, author_type: c.author_type, body: c.body, created_at: c.created_at }))
}
