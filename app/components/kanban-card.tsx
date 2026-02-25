"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Bot, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PriorityIcon } from "@/app/components/priority-icon"
import { LabelBadges } from "@/app/components/label-picker"
import { cn } from "@/lib/utils"
import type { TaskWithLabels } from "@/lib/types"

type Props = {
  task: TaskWithLabels
  isDragging?: boolean
  onClick?: () => void
}

export function KanbanCard({ task, isDragging = false, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  if (isDragging) {
    return (
      <Card className="shadow-2xl rotate-1 opacity-95 cursor-grabbing">
        <CardContent className="px-3 py-2.5">
          <div className="flex items-start gap-2">
            <GripVertical className="size-4 mt-0.5 shrink-0 text-muted-foreground/40" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">TASK-{task.id}</span>
                <PriorityIcon priority={task.priority} />
              </div>
              <span className="font-medium text-sm leading-snug">{task.title}</span>
              <LabelBadges labels={task.labels} max={2} />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <Card
        className={cn(
          "transition-all hover:shadow-sm hover:border-primary/20 cursor-pointer",
          isSortableDragging && "opacity-40 shadow-lg"
        )}
        onClick={onClick}
      >
        <CardContent className="px-3 py-2.5">
          <div className="flex items-start gap-2">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/20 hover:text-muted-foreground"
              aria-label="Drag to reorder"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="size-4 mt-0.5" />
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {/* Top row: task ID + priority */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground font-mono">TASK-{task.id}</span>
                <PriorityIcon priority={task.priority} />
              </div>

              {/* Title */}
              <span className="font-medium text-sm leading-snug">{task.title}</span>

              {/* Labels */}
              <LabelBadges labels={task.labels} max={2} />

              {/* Bottom row: assignee, due date, claimed */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {task.assignee && (
                  <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-[10px] font-medium text-primary" title={task.assignee}>
                    {task.assignee[0].toUpperCase()}
                  </span>
                )}
                {task.due_date && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Calendar className="size-2.5" aria-hidden="true" />
                    {task.due_date}
                  </span>
                )}
                {task.claimed_by && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] rounded bg-blue-500/10 text-blue-500 px-1.5 py-0.5">
                    <Bot className="size-2.5" aria-hidden="true" />
                    {task.claimed_by}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  )
}
