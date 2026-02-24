export type TaskStatus = "todo" | "in_progress" | "done"

export type Task = {
  id: number
  title: string
  description: string
  completed: 0 | 1
  created_at: string
  priority: 0 | 1 | 2 | 3
  due_date: string | null
  position: number
  status: TaskStatus
  project_id: number
  claimed_by: string | null
}

export type User = {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
  created_at: string
}

export type Project = {
  id: number
  name: string
  description: string
  owner_id: string
  created_at: string
}

export type ApiKey = {
  id: number
  project_id: number
  name: string
  key_hash: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
}

export type Comment = {
  id: number
  task_id: number
  author: string
  author_type: "human" | "agent"
  body: string
  created_at: string
}

export type ActionState = {
  error?: string
}

export type TaskEventType = "created" | "updated" | "deleted" | "toggled" | "reordered" | "moved"

export type TaskEvent = {
  type: TaskEventType
  taskId: number
  taskTitle: string
  actor: string
  projectId?: number
}
