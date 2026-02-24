import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getTasksBoard } from "@/lib/data"
import { KanbanBoard } from "@/app/components/kanban-board"
import { ViewToggle } from "@/app/components/view-toggle"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

type Props = { params: Promise<{ id: string }> }

export default async function BoardPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const columns = await getTasksBoard(projectId)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{project.name} — Board</h1>
        <div className="flex items-center gap-2">
          <ViewToggle active="board" projectId={projectId} />
          <Button asChild size="sm">
            <Link href={`/projects/${projectId}/tasks/new?returnTo=/projects/${projectId}/board`}>
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>
      <KanbanBoard initialColumns={columns} projectId={projectId} />
    </div>
  )
}
