"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import { createTask, updateTask, deleteTask, toggleTask, getTask, reorderTasks, moveTask, createProject, createComment, getProject, createLabel, updateLabel, deleteLabel, setTaskLabels, assignTask, getLabels } from "./data"
import { createApiKey, revokeApiKey } from "./api-auth"
import { emitTaskEvent } from "./emitter"
import type { ActionState, TaskStatus } from "./types"

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

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
  await requireProjectAccess(projectId)
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const priority = Number(formData.get("priority") ?? 0) as 0 | 1 | 2 | 3
  const due_date = formData.get("due_date")?.toString() || null
  const assignee = formData.get("assignee")?.toString() || null

  if (!title) return { error: "Title is required." }

  const paths = projectPaths(projectId)
  const returnTo = formData.get("returnTo")?.toString()
  const safeReturnTo = returnTo === paths.board ? paths.board : paths.tasks
  const statusRaw = formData.get("status")?.toString()
  const status: TaskStatus = VALID_STATUSES.includes(statusRaw as TaskStatus) ? (statusRaw as TaskStatus) : "todo"

  const actor = await getActor()
  const result = await createTask({ title, description, priority, due_date, status, project_id: projectId, assignee })
  const newTaskId = Number(result.lastInsertRowid)

  // Handle labels
  const labelIdsRaw = formData.get("labelIds")?.toString()
  if (labelIdsRaw) {
    const labelIds = await validateLabelIds(projectId, labelIdsRaw.split(",").map(Number).filter(Boolean))
    if (labelIds.length > 0) {
      await setTaskLabels(newTaskId, labelIds)
    }
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

  if (!data.title.trim()) return { success: false, error: "Title is required." }

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
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const completed = formData.get("completed") === "on" ? 1 : 0
  const priority = Number(formData.get("priority") ?? 0) as 0 | 1 | 2 | 3
  const due_date = formData.get("due_date")?.toString() || null
  const assignee = formData.get("assignee")?.toString() || null

  if (!title) return { error: "Title is required." }

  const actor = await getActor()
  const paths = projectPaths(projectId)
  await updateTask(id, { title, description, completed: completed as 0 | 1, priority, due_date, assignee })

  // Handle labels
  const labelIdsRaw = formData.get("labelIds")?.toString()
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

  if (!data.title.trim()) return { success: false, error: "Title is required." }

  const actor = await getActor()
  const completed = data.status === "done" ? 1 : 0
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
  const taskTitle = task.title
  await deleteTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor, projectId })
  redirect(paths.tasks)
}

export async function toggleTaskAction(projectId: number, id: number): Promise<void> {
  await requireProjectAccess(projectId)
  const actor = await getActor()
  const task = await requireTaskInProject(id, projectId)
  const taskTitle = task.title
  await toggleTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.task(id))
  revalidatePath(paths.tasks)
  emitTaskEvent({ type: "toggled", taskId: id, taskTitle, actor, projectId })
}

export async function deleteTaskListAction(projectId: number, id: number): Promise<void> {
  await requireProjectAccess(projectId)
  const actor = await getActor()
  const task = await requireTaskInProject(id, projectId)
  const taskTitle = task.title
  await deleteTask(id)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  revalidatePath(paths.board)
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor, projectId })
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

export async function reorderTasksAction(projectId: number, orderedIds: number[]): Promise<void> {
  await requireProjectAccess(projectId)
  await reorderTasks(orderedIds, projectId)
  const paths = projectPaths(projectId)
  revalidatePath(paths.tasks)
  const actor = await getActor()
  emitTaskEvent({ type: "reordered", taskId: 0, taskTitle: "", actor, projectId })
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
  const name = formData.get("name")?.toString().trim() ?? ""
  if (!name) return { error: "Key name is required." }

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
  const body = formData.get("body")?.toString().trim() ?? ""
  if (!body) return { error: "Comment cannot be empty." }

  await createComment({ task_id: taskId, author: actor, author_type: "human", body })
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`)
  return {}
}
