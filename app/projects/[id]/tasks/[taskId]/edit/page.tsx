import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getTask } from "@/lib/data"
import { updateTaskAction } from "@/lib/actions"
import { TaskForm } from "@/app/components/task-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"

type Props = { params: Promise<{ id: string; taskId: string }> }

export default async function EditTaskPage({ params }: Props) {
  const { id: projectIdStr, taskId: taskIdStr } = await params
  const projectId = Number(projectIdStr)
  const taskId = Number(taskIdStr)

  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const task = await getTask(taskId)
  if (!task || task.project_id !== projectId) notFound()

  const boundAction = updateTaskAction.bind(null, projectId, task.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback={`/projects/${projectId}/tasks/${task.id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm action={boundAction} task={task} projectId={projectId} />
        </CardContent>
      </Card>
    </div>
  )
}
