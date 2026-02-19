export type Task = {
  id: number
  title: string
  description: string
  completed: 0 | 1
  created_at: string
  priority: 0 | 1 | 2 | 3
  due_date: string | null
  position: number
}

export type ActionState = {
  error?: string
}

export type TaskEventType = "created" | "updated" | "deleted" | "toggled" | "reordered"

export type TaskEvent = {
  type: TaskEventType
  taskId: number
  taskTitle: string
  actor: string
}
