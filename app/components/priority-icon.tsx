import { ArrowUp, ArrowDown, ArrowRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

const config = {
  0: { icon: Minus, className: "text-muted-foreground/40", label: "None" },
  1: { icon: ArrowDown, className: "text-blue-500", label: "Low" },
  2: { icon: ArrowRight, className: "text-amber-500", label: "Medium" },
  3: { icon: ArrowUp, className: "text-red-500", label: "High" },
} as const

export function PriorityIcon({ priority, showLabel = false }: { priority: 0 | 1 | 2 | 3; showLabel?: boolean }) {
  if (priority === 0 && !showLabel) return null
  const { icon: Icon, className, label } = config[priority]
  return (
    <span className={cn("inline-flex items-center gap-1", className)} title={label}>
      <Icon className="size-3.5" aria-hidden="true" />
      {showLabel && <span className="text-xs font-medium">{label}</span>}
    </span>
  )
}
