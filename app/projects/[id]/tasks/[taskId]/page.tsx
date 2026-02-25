import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getTask, getComments, getTaskLabels } from "@/lib/data"
import { deleteTaskAction, toggleTaskAction, addCommentAction } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BackButton } from "@/app/components/back-button"
import { DeleteDialog } from "@/app/components/delete-dialog"
import { PriorityIcon } from "@/app/components/priority-icon"
import { DueDateBadge } from "@/app/components/due-date-badge"
import { RichTextViewer } from "@/app/components/rich-text-viewer"
import { LabelBadges } from "@/app/components/label-picker"
import { Comments } from "@/app/components/comments"
import { STATUS_CONFIG } from "@/lib/constants"
import { Calendar, Clock, Bot, UserCircle } from "lucide-react"

type Props = { params: Promise<{ id: string; taskId: string }> }

export default async function TaskPage({ params }: Props) {
  const { id: projectIdStr, taskId: taskIdStr } = await params
  const projectId = Number(projectIdStr)
  const taskId = Number(taskIdStr)

  const session = await auth()
  if (!session?.user?.id) notFound()

  const [project, task, comments, taskLabels] = await Promise.all([
    getProject(projectId),
    getTask(taskId),
    getComments(taskId),
    getTaskLabels(taskId),
  ])
  if (!project || project.owner_id !== session.user.id) notFound()
  if (!task || task.project_id !== projectId) notFound()

  const basePath = `/projects/${projectId}/tasks`
  const boundDelete = deleteTaskAction.bind(null, projectId, task.id)
  const boundToggle = toggleTaskAction.bind(null, projectId, task.id)
  const boundComment = addCommentAction.bind(null, projectId, task.id)
  const statusCfg = STATUS_CONFIG[task.status]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BackButton fallback={basePath} />

      <nav className="mb-4 hidden items-center gap-1 text-sm text-muted-foreground sm:flex" aria-label="Breadcrumb">
        <Link href={basePath} className="hover:underline">Tasks</Link>
        <span>/</span>
        <span className="truncate text-foreground font-medium">TASK-{task.id}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-xl font-bold mb-4">{task.title}</h1>

              {/* Description */}
              {task.description ? (
                <RichTextViewer html={task.description} />
              ) : (
                <p className="text-sm text-muted-foreground italic mb-4">No description</p>
              )}

              {/* Labels */}
              {taskLabels.length > 0 && (
                <div className="mt-4">
                  <LabelBadges labels={taskLabels.map(l => ({ ...l }))} max={10} />
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-6">
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

              <Separator className="my-6" />

              <Comments comments={comments.map(c => ({ ...c }))} action={boundComment} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-56 shrink-0">
          <Card>
            <CardContent className="p-4 flex flex-col gap-4">
              <SidebarField label="Status">
                <span className="flex items-center gap-1.5 text-sm">
                  <span className={`size-2 rounded-full ${statusCfg.dotClass}`} />
                  {statusCfg.label}
                </span>
              </SidebarField>

              <SidebarField label="Priority">
                <PriorityIcon priority={task.priority} showLabel />
              </SidebarField>

              <SidebarField label="Assignee">
                <span className="flex items-center gap-1.5 text-sm">
                  <UserCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  {task.assignee ?? "Unassigned"}
                </span>
              </SidebarField>

              {task.due_date && (
                <SidebarField label="Due date">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Calendar className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {task.due_date}
                  </span>
                </SidebarField>
              )}

              {task.claimed_by && (
                <SidebarField label="Claimed by">
                  <span className="flex items-center gap-1.5 text-sm">
                    <Bot className="size-3.5 text-blue-500" aria-hidden="true" />
                    {task.claimed_by}
                  </span>
                </SidebarField>
              )}

              <Separator />

              <SidebarField label="Created">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  {new Date(task.created_at).toLocaleDateString()}
                </span>
              </SidebarField>

              <SidebarField label="ID">
                <span className="text-xs font-mono text-muted-foreground">TASK-{task.id}</span>
              </SidebarField>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
