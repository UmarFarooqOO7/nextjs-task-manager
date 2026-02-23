import { TaskForm } from "@/app/components/task-form"
import { createTaskAction } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"
import type { TaskStatus } from "@/lib/types"

type Props = {
  searchParams: Promise<{ returnTo?: string; status?: string }>
}

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

export default async function NewTaskPage({ searchParams }: Props) {
  const { returnTo, status } = await searchParams
  const safeReturnTo = returnTo === "/tasks/board" ? "/tasks/board" : "/tasks"
  const safeStatus = VALID_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : "todo"

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback={safeReturnTo} />
      <Card>
        <CardHeader>
          <CardTitle>New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm action={createTaskAction} returnTo={safeReturnTo} defaultStatus={safeStatus} />
        </CardContent>
      </Card>
    </div>
  )
}
