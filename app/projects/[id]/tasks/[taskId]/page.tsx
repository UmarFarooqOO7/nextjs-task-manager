import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getProject, getTask, getComments, getTaskLabels } from "@/lib/data"
import { deleteTaskAction, toggleTaskAction, addCommentAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { BackButton } from "@/app/components/back-button"
import { DeleteDialog } from "@/app/components/delete-dialog"
import { PriorityIcon } from "@/app/components/priority-icon"
import { RichTextViewer } from "@/app/components/rich-text-viewer"
import { LabelBadges } from "@/app/components/label-picker"
import { Comments } from "@/app/components/comments"
import { STATUS_CONFIG } from "@/lib/constants"
import { Calendar, Clock, Bot, UserCircle } from "lucide-react"

type Props = { params: Promise<{ id: string; taskId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, taskId } = await params
  const [project, task] = await Promise.all([
    getProject(Number(id)),
    getTask(Number(taskId)),
  ])
  const title = task ? `TASK-${task.id}: ${task.title}` : "Task"
  const projectName = project?.name ?? "Project"
  return { title: `${title} — ${projectName} — Taskflow` }
}

export default async function TaskPage({ params }: Props) {
  const { id: projectIdStr, taskId: taskIdStr } = await params
  const projectId = Number(projectIdStr)
  const taskId = Number(taskIdStr)

  const session = await auth()
  if (!session?.user?.id) notFound()

  const [project, task] = await Promise.all([
    getProject(projectId),
    getTask(taskId),
  ])
  if (!project || project.owner_id !== session.user.id) notFound()
  if (!task || task.project_id !== projectId) notFound()

  const basePath = `/projects/${projectId}/board`
  const boundDelete = deleteTaskAction.bind(null, projectId, task.id)
  const boundToggle = toggleTaskAction.bind(null, projectId, task.id)
  const boundComment = addCommentAction.bind(null, projectId, task.id)
  const statusCfg = STATUS_CONFIG[task.status]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BackButton fallback={basePath} />

      <nav className="mb-4 hidden items-center gap-1 text-sm text-muted-foreground sm:flex" aria-label="Breadcrumb">
        <Link href={basePath} className="hover:underline">Board</Link>
        <span>/</span>
        <span className="truncate text-foreground font-medium">TASK-{task.id}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">
              <h1 className="text-xl font-bold mb-4">{task.title}</h1>

              {task.description ? (
                <RichTextViewer html={task.description} />
              ) : (
                <p className="text-sm text-muted-foreground italic mb-4">No description</p>
              )}

              {/* Labels */}
              <Suspense fallback={<Skeleton className="h-5 w-32 mt-4" />}>
                <TaskLabels taskId={taskId} />
              </Suspense>

              <div className="flex flex-wrap gap-2 mt-6">
                <form action={boundToggle}>
                  <Button type="submit" variant="outline" size="sm">
                    {task.completed ? "Mark Pending" : "Mark Done"}
                  </Button>
                </form>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${projectId}/tasks/${task.id}/edit`}>Edit</Link>
                </Button>
                <DeleteDialog action={boundDelete} />
              </div>

              <Separator className="my-6" />

              <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                <TaskComments taskId={taskId} action={boundComment} />
              </Suspense>
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

async function TaskLabels({ taskId }: { taskId: number }) {
  const taskLabels = await getTaskLabels(taskId)
  if (taskLabels.length === 0) return null
  return (
    <div className="mt-4">
      <LabelBadges labels={taskLabels.map(l => ({ ...l }))} max={10} />
    </div>
  )
}

async function TaskComments({ taskId, action }: { taskId: number; action: (prev: { error?: string }, fd: FormData) => Promise<{ error?: string }> }) {
  const comments = await getComments(taskId)
  return <Comments comments={comments.map(c => ({ ...c }))} action={action} />
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
