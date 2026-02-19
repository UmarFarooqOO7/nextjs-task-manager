export type Task = {
  id: number
  title: string
  description: string
  completed: 0 | 1
  created_at: string
}

export type ActionState = {
  error?: string
}

export type TaskEventType = "created" | "updated" | "deleted" | "toggled"

export type TaskEvent = {
  type: TaskEventType
  taskId: number
  taskTitle: string
  actor: string
}
