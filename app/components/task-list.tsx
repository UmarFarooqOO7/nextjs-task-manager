"use client"

import { useOptimistic, useTransition, useState } from "react"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { DeleteDialog } from "@/app/components/delete-dialog"
import { PriorityBadge } from "@/app/components/priority-badge"
import { DueDateBadge } from "@/app/components/due-date-badge"
import { Highlight } from "@/app/components/highlight"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/types"

type OptimisticAction =
  | { type: "toggle"; id: number }
  | { type: "delete"; id: number }
  | { type: "reorder"; tasks: Task[] }

function applyOptimistic(tasks: Task[], action: OptimisticAction): Task[] {
  switch (action.type) {
    case "toggle":
      return tasks.map(t =>
        t.id === action.id ? { ...t, completed: t.completed === 0 ? 1 : 0 } : t
      )
    case "delete":
      return tasks.filter(t => t.id !== action.id)
    case "reorder":
      return action.tasks
  }
}

// ── Sortable row ────────────────────────────────────────────────────────────

function SortableTaskRow({
  task,
  query,
  projectId,
  onToggle,
  onDelete,
}: {
  task: Task
  query: string
  projectId: number
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const basePath = `/projects/${projectId}/tasks`

  return (
    <li ref={setNodeRef} style={style}>
      <Card className={cn("transition-colors hover:bg-accent/40", isDragging && "shadow-lg")}>
        <CardContent className="flex items-center gap-2 px-3 py-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>

          {/* Toggle badge */}
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            title={task.completed ? "Mark as pending" : "Mark as done"}
            className={cn(
              badgeVariants({ variant: task.completed ? "default" : "secondary" }),
              "cursor-pointer transition-opacity hover:opacity-75 shrink-0"
            )}
          >
            {task.completed ? "Done" : "Pending"}
          </button>

          {/* Title + meta */}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <Link
                href={`${basePath}/${task.id}`}
                className="truncate font-medium hover:underline"
              >
                <Highlight text={task.title} query={query} />
              </Link>
              <PriorityBadge priority={task.priority} />
            </div>
            <div className="flex items-center gap-2">
              {task.description && (
                <p className="truncate text-sm text-muted-foreground">
                  <Highlight text={task.description} query={query} />
                </p>
              )}
              <DueDateBadge dueDate={task.due_date} completed={task.completed} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`${basePath}/${task.id}/edit`}>Edit</Link>
            </Button>
            <DeleteDialog
              action={async () => { await onDelete(task.id) }}
              compact
            />
          </div>
        </CardContent>
      </Card>
    </li>
  )
}

// ── Main list ────────────────────────────────────────────────────────────────

type Props = {
  tasks: Task[]
  query: string
  projectId: number
  toggleAction: (id: number) => Promise<void>
  deleteAction: (id: number) => Promise<void>
  reorderAction: (ids: number[]) => Promise<void>
}

export function TaskList({ tasks: initialTasks, query, projectId, toggleAction, deleteAction, reorderAction }: Props) {
  const [optimisticTasks, applyAction] = useOptimistic(initialTasks, applyOptimistic)
  const [, startTransition] = useTransition()
  const [isDndEnabled] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleToggle(id: number) {
    startTransition(async () => {
      applyAction({ type: "toggle", id })
      await toggleAction(id)
    })
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      applyAction({ type: "delete", id })
      await deleteAction(id)
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = optimisticTasks.findIndex(t => t.id === active.id)
    const newIndex = optimisticTasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(optimisticTasks, oldIndex, newIndex)
    startTransition(async () => {
      applyAction({ type: "reorder", tasks: reordered })
      await reorderAction(reordered.map(t => t.id))
    })
  }

  if (!isDndEnabled || query) {
    return (
      <ul className="flex flex-col gap-2">
        {optimisticTasks.map(task => (
          <SortableTaskRow
            key={task.id}
            task={task}
            query={query}
            projectId={projectId}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    )
  }

  return (
    <DndContext id="task-list-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={optimisticTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {optimisticTasks.map(task => (
            <SortableTaskRow
              key={task.id}
              task={task}
              query={query}
              projectId={projectId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
