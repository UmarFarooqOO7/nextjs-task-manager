"use client"

import { Plus } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "@/app/components/kanban-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { STATUS_CONFIG } from "@/lib/constants"
import type { TaskWithLabels, TaskStatus } from "@/lib/types"

type Props = {
  status: TaskStatus
  tasks: TaskWithLabels[]
  isOver: boolean
  onTaskClick: (task: TaskWithLabels) => void
  onAddTask: (status: TaskStatus) => void
  projectMap?: Map<number, string>
}

export function KanbanColumn({ status, tasks, isOver, onTaskClick, onAddTask, projectMap }: Props) {
  const { setNodeRef } = useDroppable({ id: status })
  const config = STATUS_CONFIG[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border bg-muted/20 transition-all",
        isOver && "ring-2 ring-primary/30 bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div className="flex items-center gap-2">
          <span className={`size-2.5 rounded-full ${config.dotClass}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 font-medium">
            {tasks.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => onAddTask(status)}
          aria-label={`Add task to ${config.label}`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2 p-2 min-h-[4rem]">
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              projectName={projectMap?.get(task.project_id)}
            />
          ))}
        </ul>
      </SortableContext>
    </div>
  )
}
