"use client"

import { useState } from "react"
import { useActionState } from "react"
import { SubmitButton } from "./submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@radix-ui/react-label"
import Link from "next/link"
import type { ActionState, Task, TaskStatus } from "@/lib/types"

type Props = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
  task?: Task
  returnTo?: string
  defaultStatus?: TaskStatus
  projectId?: number
}

export function TaskForm({ action, task, returnTo, defaultStatus, projectId }: Props) {
  const [state, formAction] = useActionState(action, {})
  const [priority, setPriority] = useState(String(task?.priority ?? 0))
  const [status, setStatus] = useState<string>(defaultStatus ?? "todo")

  const taskDetailPath = task && projectId ? `/projects/${projectId}/tasks/${task.id}` : "/projects"
  const cancelPath = task ? taskDetailPath : (returnTo ?? (projectId ? `/projects/${projectId}/tasks` : "/projects"))

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="priority" value={priority} />
      {!task && <input type="hidden" name="status" value={status} />}

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

      <div className={`grid gap-4 ${!task ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
        {!task && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-sm font-medium">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">None</SelectItem>
              <SelectItem value="1">Low</SelectItem>
              <SelectItem value="2">Medium</SelectItem>
              <SelectItem value="3">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="due_date" className="text-sm font-medium">
            Due Date
          </Label>
          <Input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={task?.due_date ?? ""}
          />
        </div>
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
          <Link href={cancelPath}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
