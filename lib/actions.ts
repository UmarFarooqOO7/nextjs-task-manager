"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createTask, updateTask, deleteTask, toggleTask, getTask } from "./data"
import { emitTaskEvent } from "./emitter"
import type { ActionState } from "./types"

async function getActor(): Promise<string> {
  return (await cookies()).get("actor")?.value ?? "Someone"
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""

  if (!title) return { error: "Title is required." }

  const actor = await getActor()
  const result = createTask({ title, description })
  revalidatePath("/tasks")
  emitTaskEvent({ type: "created", taskId: Number(result.lastInsertRowid), taskTitle: title, actor })
  redirect("/tasks")
}

export async function updateTaskAction(
  id: number,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const title = formData.get("title")?.toString().trim() ?? ""
  const description = formData.get("description")?.toString().trim() ?? ""
  const completed = formData.get("completed") === "on" ? 1 : 0

  if (!title) return { error: "Title is required." }

  const actor = await getActor()
  updateTask(id, { title, description, completed: completed as 0 | 1 })
  revalidatePath("/tasks")
  revalidatePath(`/tasks/${id}`)
  emitTaskEvent({ type: "updated", taskId: id, taskTitle: title, actor })
  redirect(`/tasks/${id}`)
}

export async function deleteTaskAction(id: number): Promise<void> {
  const actor = await getActor()
  const task = getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  deleteTask(id)
  revalidatePath("/tasks")
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor })
  redirect("/tasks")
}

export async function toggleTaskAction(id: number): Promise<void> {
  const actor = await getActor()
  const task = getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  toggleTask(id)
  revalidatePath(`/tasks/${id}`)
  revalidatePath("/tasks")
  emitTaskEvent({ type: "toggled", taskId: id, taskTitle, actor })
}

export async function deleteTaskListAction(id: number): Promise<void> {
  const actor = await getActor()
  const task = getTask(id)
  const taskTitle = task?.title ?? "Unknown"
  deleteTask(id)
  revalidatePath("/tasks")
  emitTaskEvent({ type: "deleted", taskId: id, taskTitle, actor })
}
