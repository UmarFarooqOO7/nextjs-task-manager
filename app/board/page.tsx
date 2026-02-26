import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getAllTasksBoard } from "@/lib/data"
import { moveTaskGlobalAction } from "@/lib/actions"
import { KanbanBoard } from "@/app/components/kanban-board"
import { BackButton } from "@/app/components/back-button"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Board — Taskflow",
}

export default async function GlobalBoardPage() {
  const session = await auth()
  if (!session?.user?.id) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <BackButton fallback="/projects" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Board</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All tasks across projects</p>
      </div>
      <Suspense fallback={<BoardSkeleton />}>
        <BoardContent userId={session.user.id} />
      </Suspense>
    </div>
  )
}

async function BoardContent({ userId }: { userId: string }) {
  const { columns: columnsRaw, projects } = await getAllTasksBoard(userId)

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No projects yet. Create a project to get started.
      </p>
    )
  }

  const columns = Object.fromEntries(
    Object.entries(columnsRaw).map(([k, tasks]) => [k, tasks.map(t => ({ ...t, labels: t.labels.map(l => ({ ...l })) }))])
  ) as typeof columnsRaw

  // Collect all labels from all projects (deduped by id)
  const labelMap = new Map<number, (typeof columnsRaw)["todo"][0]["labels"][0]>()
  for (const tasks of Object.values(columnsRaw)) {
    for (const task of tasks) {
      for (const label of task.labels) {
        labelMap.set(label.id, { ...label })
      }
    }
  }
  const allLabels = Array.from(labelMap.values())

  return (
    <KanbanBoard
      initialColumns={columns}
      projectId={projects[0].id}
      labels={allLabels}
      moveTaskAction={moveTaskGlobalAction}
      projects={projects.map(p => ({ ...p }))}
      showProjectBadge
    />
  )
}

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, col) => (
        <div key={col} className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="size-2 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {Array.from({ length: col === 0 ? 3 : 2 }).map((_, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="size-4" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
