import { cn } from "@/lib/utils"

function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date())
}

export function DueDateBadge({ dueDate, completed }: { dueDate: string | null; completed: 0 | 1 }) {
  if (!dueDate) return null
  const overdue = completed === 0 && dueDate < todayLocal()
  return (
    <span className={cn(
      "text-xs",
      overdue ? "text-destructive font-medium" : "text-muted-foreground"
    )}>
      {overdue ? "Overdue · " : ""}{dueDate}
    </span>
  )
}
