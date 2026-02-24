"use client"

import { useState, useOptimistic, useTransition } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumn } from "@/app/components/kanban-column"
import { KanbanCard } from "@/app/components/kanban-card"
import { moveTaskAction } from "@/lib/actions"
import type { Task, TaskStatus } from "@/lib/types"

type Columns = Record<TaskStatus, Task[]>

const COLUMN_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]
const COLUMN_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
}

type OptimisticAction = {
  type: "move"
  taskId: number
  fromStatus: TaskStatus
  toStatus: TaskStatus
  fromIndex: number
  toIndex: number
}

function applyOptimistic(columns: Columns, action: OptimisticAction): Columns {
  if (action.type !== "move") return columns

  const { taskId, fromStatus, toStatus, fromIndex, toIndex } = action
  const task = columns[fromStatus].find(t => t.id === taskId)
  if (!task) return columns

  const updatedTask = { ...task, status: toStatus, completed: toStatus === "done" ? 1 as const : 0 as const }

  if (fromStatus === toStatus) {
    return {
      ...columns,
      [fromStatus]: arrayMove(columns[fromStatus], fromIndex, toIndex),
    }
  }

  const newFrom = columns[fromStatus].filter(t => t.id !== taskId)
  const newTo = [...columns[toStatus]]
  newTo.splice(toIndex, 0, updatedTask)

  return {
    ...columns,
    [fromStatus]: newFrom,
    [toStatus]: newTo,
  }
}

function findColumnForTask(columns: Columns, taskId: number | string): TaskStatus | null {
  for (const status of COLUMN_STATUSES) {
    if (columns[status].some(t => t.id === Number(taskId))) return status
  }
  return null
}

function isColumnStatus(id: string | number): id is TaskStatus {
  return COLUMN_STATUSES.includes(id as TaskStatus)
}

type Props = {
  initialColumns: Columns
  projectId: number
}

export function KanbanBoard({ initialColumns, projectId }: Props) {
  const [optimisticColumns, applyAction] = useOptimistic(initialColumns, applyOptimistic)
  const [, startTransition] = useTransition()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const boundMoveTask = moveTaskAction.bind(null, projectId)

  function handleDragStart(event: DragStartEvent) {
    const taskId = Number(event.active.id)
    for (const status of COLUMN_STATUSES) {
      const found = optimisticColumns[status].find(t => t.id === taskId)
      if (found) {
        setActiveTask(found)
        return
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    if (!over) {
      setOverColumn(null)
      return
    }
    if (isColumnStatus(over.id)) {
      setOverColumn(over.id as TaskStatus)
    } else {
      const col = findColumnForTask(optimisticColumns, over.id)
      setOverColumn(col)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    setOverColumn(null)

    if (!over) return

    const taskId = Number(active.id)
    const fromStatus = findColumnForTask(optimisticColumns, taskId)
    if (!fromStatus) return

    let toStatus: TaskStatus
    if (isColumnStatus(over.id)) {
      toStatus = over.id as TaskStatus
    } else {
      const col = findColumnForTask(optimisticColumns, over.id)
      if (!col) return
      toStatus = col
    }

    const fromCol = optimisticColumns[fromStatus]
    const toCol = optimisticColumns[toStatus]
    const fromIndex = fromCol.findIndex(t => t.id === taskId)

    let toIndex: number
    if (fromStatus === toStatus) {
      if (isColumnStatus(over.id)) {
        toIndex = toCol.length - 1
      } else {
        toIndex = toCol.findIndex(t => t.id === Number(over.id))
        if (toIndex === -1) toIndex = toCol.length - 1
      }
      if (fromIndex === toIndex) return
    } else {
      if (isColumnStatus(over.id)) {
        toIndex = toCol.length
      } else {
        toIndex = toCol.findIndex(t => t.id === Number(over.id))
        if (toIndex === -1) toIndex = toCol.length
      }
    }

    startTransition(async () => {
      applyAction({ type: "move", taskId, fromStatus, toStatus, fromIndex, toIndex })

      let finalDestCol: Task[]
      if (fromStatus === toStatus) {
        finalDestCol = arrayMove(fromCol, fromIndex, toIndex)
      } else {
        const task = fromCol[fromIndex]
        finalDestCol = [...toCol]
        finalDestCol.splice(toIndex, 0, task)
      }

      await boundMoveTask(taskId, toStatus, finalDestCol.map(t => t.id))
    })
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMN_STATUSES.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            label={COLUMN_LABELS[status]}
            tasks={optimisticColumns[status]}
            isOver={overColumn === status}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
