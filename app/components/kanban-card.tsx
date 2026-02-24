"use client"

import Link from "next/link"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PriorityBadge } from "@/app/components/priority-badge"
import { DueDateBadge } from "@/app/components/due-date-badge"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/types"

type Props = {
  task: Task
  isDragging?: boolean
}

export function KanbanCard({ task, isDragging = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const taskPath = `/projects/${task.project_id}/tasks/${task.id}`

  if (isDragging) {
    return (
      <Card className="shadow-2xl rotate-1 opacity-95 cursor-grabbing">
        <CardContent className="px-3 py-3">
          <div className="flex items-start gap-2">
            <GripVertical className="size-4 mt-0.5 shrink-0 text-muted-foreground/40" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-medium text-sm truncate">{task.title}</span>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <PriorityBadge priority={task.priority} />
                <DueDateBadge dueDate={task.due_date} completed={task.completed} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <Card
        {...attributes}
        {...listeners}
        className={cn(
          "cursor-grab active:cursor-grabbing touch-none transition-colors hover:bg-accent/40",
          isSortableDragging && "opacity-40 shadow-lg"
        )}
      >
        <CardContent className="px-3 py-3">
          <div className="flex items-start gap-2">
            <GripVertical className="size-4 mt-0.5 shrink-0 text-muted-foreground/20" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link
                href={taskPath}
                className="font-medium text-sm truncate hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {task.title}
              </Link>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <PriorityBadge priority={task.priority} />
                <DueDateBadge dueDate={task.due_date} completed={task.completed} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  )
}
