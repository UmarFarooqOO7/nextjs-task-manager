import { notFound } from "next/navigation"
import { getTask } from "@/lib/data"
import { updateTaskAction } from "@/lib/actions"
import { TaskForm } from "@/app/components/task-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"

type Props = { params: Promise<{ id: string }> }

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params
  const task = await getTask(Number(id))
  if (!task) notFound()

  const boundAction = updateTaskAction.bind(null, task.id)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback={`/tasks/${task.id}`} />
      <Card>
        <CardHeader>
          <CardTitle>Edit Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm action={boundAction} task={task} />
        </CardContent>
      </Card>
    </div>
  )
}
