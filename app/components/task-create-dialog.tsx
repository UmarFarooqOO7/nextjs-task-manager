"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichTextEditor } from "./rich-text-editor"
import { LabelPicker } from "./label-picker"
import { createTaskInlineAction } from "@/lib/actions"
import { STATUS_CONFIG } from "@/lib/constants"
import type { Label, TaskStatus } from "@/lib/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultStatus?: TaskStatus
  labels: Label[]
  projectId: number
}

export function TaskCreateDialog({ open, onOpenChange, defaultStatus = "todo", labels, projectId }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState("0")
  const [dueDate, setDueDate] = useState("")
  const [assignee, setAssignee] = useState("")
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([])
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function reset() {
    setTitle("")
    setDescription("")
    setStatus(defaultStatus)
    setPriority("0")
    setDueDate("")
    setAssignee("")
    setSelectedLabelIds([])
    setError("")
  }

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.")
      return
    }
    startTransition(async () => {
      const result = await createTaskInlineAction(projectId, {
        title: title.trim(),
        description,
        priority: Number(priority),
        due_date: dueDate || null,
        status,
        assignee: assignee || null,
        labelIds: selectedLabelIds,
      })
      if (result.success) {
        reset()
        onOpenChange(false)
      } else {
        setError(result.error ?? "Failed to create task.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSubmit() }}
          />

          <RichTextEditor
            content={description}
            onChange={setDescription}
            placeholder="Add a description..."
            className="min-h-[100px]"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-1.5">
                        <span className={`size-2 rounded-full ${cfg.dotClass}`} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-8 text-xs">
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

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Due date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Assignee</label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Unassigned"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Labels</label>
            <LabelPicker labels={labels} selected={selectedLabelIds} onChange={setSelectedLabelIds} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { reset(); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !title.trim()}>
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
