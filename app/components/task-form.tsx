"use client"

import { useActionState } from "react"
import { SubmitButton } from "./submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@radix-ui/react-label"
import Link from "next/link"
import type { ActionState, Task } from "@/lib/types"

type Props = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  task?: Task
}

export function TaskForm({ action, task }: Props) {
  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={task?.title ?? ""}
          placeholder="Task title"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={task?.description ?? ""}
          placeholder="Optional description"
        />
      </div>

      {task && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="completed"
            name="completed"
            defaultChecked={task.completed === 1}
          />
          <Label htmlFor="completed" className="text-sm font-medium cursor-pointer">
            Mark as completed
          </Label>
        </div>
      )}

      <div className="flex gap-3">
        <SubmitButton label={task ? "Update Task" : "Create Task"} />
        <Button variant="outline" asChild>
          <Link href={task ? `/tasks/${task.id}` : "/tasks"}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
