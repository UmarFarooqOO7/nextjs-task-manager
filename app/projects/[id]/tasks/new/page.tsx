import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject } from "@/lib/data"
import { createTaskAction } from "@/lib/actions"
import { TaskForm } from "@/app/components/task-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"
import type { TaskStatus } from "@/lib/types"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ returnTo?: string; status?: string }>
}

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

export default async function NewTaskPage({ params, searchParams }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const { returnTo, status } = await searchParams
  const boardPath = `/projects/${projectId}/board`
  const tasksPath = `/projects/${projectId}/tasks`
  const safeReturnTo = returnTo === tasksPath ? tasksPath : boardPath
  const safeStatus = VALID_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : "todo"

  const boundAction = createTaskAction.bind(null, projectId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback={safeReturnTo} />
      <Card>
        <CardHeader>
          <CardTitle>New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            action={boundAction}
            returnTo={safeReturnTo}
            defaultStatus={safeStatus}
            projectId={projectId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
