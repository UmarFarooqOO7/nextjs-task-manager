import { cn } from "@/lib/utils"

const LABELS = ["", "Low", "Medium", "High"]
const COLORS = [
  "",
  "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
  "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
]

export function PriorityBadge({ priority }: { priority: 0 | 1 | 2 | 3 }) {
  if (priority === 0) return null
  return (
    <span className={cn(
      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
      COLORS[priority]
    )}>
      {LABELS[priority]}
    </span>
  )
}
