"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "@/app/components/kanban-card"
import { cn } from "@/lib/utils"
import type { Task, TaskStatus } from "@/lib/types"

type Props = {
  status: TaskStatus
  label: string
  tasks: Task[]
  isOver: boolean
  projectId: number
}

export function KanbanColumn({ status, label, tasks, isOver, projectId }: Props) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex flex-col rounded-lg border bg-muted/30 transition-colors",
        isOver && "border-primary bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[calc(100vh-14rem)] min-h-[4rem]">
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </ul>
      </SortableContext>

      {/* Add task — visible on column hover */}
      <div className="px-2 pb-2">
        <Link
          href={`/projects/${projectId}/tasks/new?status=${status}&returnTo=/projects/${projectId}/board`}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-accent hover:text-foreground"
          aria-label={`Add task to ${label}`}
        >
          <Plus className="size-3.5 shrink-0" />
          Add task
        </Link>
      </div>
    </div>
  )
}
