import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getTasksBoard, getLabels } from "@/lib/data"
import { KanbanBoard } from "@/app/components/kanban-board"
import { ViewToggle } from "@/app/components/view-toggle"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Settings } from "lucide-react"

type Props = { params: Promise<{ id: string }> }

export default async function BoardPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const [columnsRaw, labels] = await Promise.all([
    getTasksBoard(projectId),
    getLabels(projectId),
  ])
  const columns = Object.fromEntries(
    Object.entries(columnsRaw).map(([k, tasks]) => [k, tasks.map(t => ({ ...t, labels: t.labels.map(l => ({ ...l })) }))])
  ) as typeof columnsRaw

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Board view</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="size-8" aria-label="Project settings">
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="size-4" />
            </Link>
          </Button>
          <ViewToggle active="board" projectId={projectId} />
        </div>
      </div>
      <KanbanBoard
        initialColumns={columns}
        projectId={projectId}
        labels={labels.map(l => ({ ...l }))}
      />
    </div>
  )
}
