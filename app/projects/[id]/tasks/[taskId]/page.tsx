import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getTask, getComments } from "@/lib/data"
import { deleteTaskAction, toggleTaskAction, addCommentAction } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"
import { DeleteDialog } from "@/app/components/delete-dialog"
import { PriorityBadge } from "@/app/components/priority-badge"
import { DueDateBadge } from "@/app/components/due-date-badge"
import { Comments } from "@/app/components/comments"

type Props = { params: Promise<{ id: string; taskId: string }> }

export default async function TaskPage({ params }: Props) {
  const { id: projectIdStr, taskId: taskIdStr } = await params
  const projectId = Number(projectIdStr)
  const taskId = Number(taskIdStr)

  const session = await auth()
  if (!session?.user?.id) notFound()

  const [project, task, comments] = await Promise.all([
    getProject(projectId),
    getTask(taskId),
    getComments(taskId),
  ])
  if (!project || project.owner_id !== session.user.id) notFound()
  if (!task || task.project_id !== projectId) notFound()

  const basePath = `/projects/${projectId}/tasks`
  const boundDelete = deleteTaskAction.bind(null, projectId, task.id)
  const boundToggle = toggleTaskAction.bind(null, projectId, task.id)
  const boundComment = addCommentAction.bind(null, projectId, task.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback={basePath} />

      <nav className="mb-4 hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
        <Link href={basePath} className="hover:underline">Tasks</Link>
        <span>/</span>
        <span className="truncate text-foreground">{task.title}</span>
      </nav>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <CardTitle className="text-xl leading-tight">{task.title}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <PriorityBadge priority={task.priority} />
            <Badge variant={task.completed ? "default" : "secondary"} className="mt-0.5">
              {task.completed ? "Done" : "Pending"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {task.description && (
            <p className="text-muted-foreground">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Created {new Date(task.created_at).toLocaleString()}</span>
            {task.due_date && (
              <DueDateBadge dueDate={task.due_date} completed={task.completed} />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={boundToggle}>
              <Button type="submit" variant="outline" size="sm">
                {task.completed ? "Mark Pending" : "Mark Done"}
              </Button>
            </form>

            <Button variant="outline" size="sm" asChild>
              <Link href={`${basePath}/${task.id}/edit`}>Edit</Link>
            </Button>

            <DeleteDialog action={boundDelete} />
          </div>

          <hr />

          <Comments comments={comments} action={boundComment} />
        </CardContent>
      </Card>
    </div>
  )
}
