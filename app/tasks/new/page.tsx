import { TaskForm } from "@/app/components/task-form"
import { createTaskAction } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"

export default function NewTaskPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback="/tasks" />
      <Card>
        <CardHeader>
          <CardTitle>New Task</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm action={createTaskAction} />
        </CardContent>
      </Card>
    </div>
  )
}
