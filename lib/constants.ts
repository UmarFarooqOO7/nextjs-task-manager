import type { TaskStatus } from "./types"

export const LABEL_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Purple", value: "#a855f7" },
] as const

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dotClass: string }> = {
  todo: {
    label: "TODO",
    color: "#6b7280",
    dotClass: "bg-gray-400",
  },
  in_progress: {
    label: "IN PROGRESS",
    color: "#f59e0b",
    dotClass: "bg-amber-400",
  },
  done: {
    label: "DONE",
    color: "#22c55e",
    dotClass: "bg-green-400",
  },
}

export const PRIORITY_CONFIG = [
  { label: "None", value: 0 },
  { label: "Low", value: 1 },
  { label: "Medium", value: 2 },
  { label: "High", value: 3 },
] as const
