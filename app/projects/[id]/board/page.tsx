import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getProject, getTasksBoard, getLabels } from "@/lib/data"
import { moveTaskAction } from "@/lib/actions"
import { KanbanBoard } from "@/app/components/kanban-board"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Settings } from "lucide-react"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(Number(id))
  return { title: project ? `Board — ${project.name} — Taskflow` : "Board — Taskflow" }
}

export default async function BoardPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Board</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="size-8" aria-label="Project settings">
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
      <Suspense fallback={<BoardSkeleton />}>
        <BoardContent projectId={projectId} />
      </Suspense>
    </div>
  )
}

async function BoardContent({ projectId }: { projectId: number }) {
  const [columnsRaw, labels] = await Promise.all([
    getTasksBoard(projectId),
    getLabels(projectId),
  ])
  const columns = Object.fromEntries(
    Object.entries(columnsRaw).map(([k, tasks]) => [k, tasks.map(t => ({ ...t, labels: t.labels.map(l => ({ ...l })) }))])
  ) as typeof columnsRaw

  const boundMoveTask = moveTaskAction.bind(null, projectId)

  return (
    <KanbanBoard
      initialColumns={columns}
      projectId={projectId}
      labels={labels.map(l => ({ ...l }))}
      moveTaskAction={boundMoveTask}
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
