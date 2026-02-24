"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createTask, updateTask, deleteTask, toggleTask, getTask, reorderTasks, moveTask } from "./data"
import { emitTaskEvent } from "./emitter"
import type { ActionState, TaskStatus } from "./types"

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

async function getActor(): Promise<string> {
  return (await cookies()).get("actor")?.value ?? "Someone"
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const priority = Number(formData.get("priority") ?? 0) as 0 | 1 | 2 | 3
  const due_date = formData.get("due_date")?.toString() || null

  if (!title) return { error: "Title is required." }

  const returnTo = formData.get("returnTo")?.toString()
  const safeReturnTo = returnTo === "/tasks/board" ? "/tasks/board" : "/tasks"
  const statusRaw = formData.get("status")?.toString()
  const status: TaskStatus = VALID_STATUSES.includes(statusRaw as TaskStatus) ? (statusRaw as TaskStatus) : "todo"

  const actor = await getActor()
  const result = await createTask({ title, description, priority, due_date, status })
  revalidatePath("/tasks")
  revalidatePath("/tasks/board")
  emitTaskEvent({ type: "created", taskId: Number(result.lastInsertRowid), taskTitle: title, actor })
  redirect(safeReturnTo)
}

export async function updateTaskAction(
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
  await updateTask(id, { title, description, completed: completed as 0 | 1, priority, due_date })
  revalidatePath("/tasks")
  revalidatePath(`/tasks/${id}`)
  emitTaskEvent({ type: "updated", taskId: id, taskTitle: title, actor })
  redirect(`/tasks/${id}`)
}

export async function deleteTaskAction(id: number): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  await deleteTask(id)
  revalidatePath("/tasks")
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor })
  redirect("/tasks")
}

export async function toggleTaskAction(id: number): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  await toggleTask(id)
  revalidatePath(`/tasks/${id}`)
  revalidatePath("/tasks")
  emitTaskEvent({ type: "toggled", taskId: id, taskTitle, actor })
}

export async function deleteTaskListAction(id: number): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  await deleteTask(id)
  revalidatePath("/tasks")
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor })
}

export async function reorderTasksAction(orderedIds: number[]): Promise<void> {
  await reorderTasks(orderedIds)
  revalidatePath("/tasks")
  const actor = await getActor()
  emitTaskEvent({ type: "reordered", taskId: 0, taskTitle: "", actor })
}

export async function moveTaskAction(
  id: number,
  status: TaskStatus,
  orderedColumnIds: number[]
): Promise<void> {
  const actor = await getActor()
  const task = await getTask(id)
  const position = orderedColumnIds.indexOf(id)
  await moveTask(id, status, position)
  await reorderTasks(orderedColumnIds)
  revalidatePath("/tasks")
  revalidatePath("/tasks/board")
  emitTaskEvent({ type: "moved", taskId: id, taskTitle: task?.title ?? "", actor })
}
