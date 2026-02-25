"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { RichTextEditor } from "./rich-text-editor"
import { RichTextViewer } from "./rich-text-viewer"
import { LabelPicker, LabelBadges } from "./label-picker"
import { PriorityIcon } from "./priority-icon"
import { updateTaskInlineAction, deleteTaskInlineAction } from "@/lib/actions"
import { STATUS_CONFIG } from "@/lib/constants"
import { Calendar, Clock, Trash2, Bot, Pencil } from "lucide-react"
import type { TaskWithLabels, Label, TaskStatus } from "@/lib/types"

type Props = {
  task: TaskWithLabels | null
  open: boolean
  onOpenChange: (open: boolean) => void
  labels: Label[]
  projectId: number
}

export function TaskDetailDialog({ task, open, onOpenChange, labels, projectId }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Edit state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [priority, setPriority] = useState<number>(0)
  const [dueDate, setDueDate] = useState("")
  const [assignee, setAssignee] = useState<string | null>(null)
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([])

  function startEdit() {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? "")
    setAssignee(task.assignee)
    setSelectedLabelIds(task.labels.map(l => l.id))
    setIsEditing(true)
  }

  function handleSave() {
    if (!task) return
    startTransition(async () => {
      const result = await updateTaskInlineAction(projectId, task.id, {
        title,
        description,
        priority,
        due_date: dueDate || null,
        status,
        assignee,
        labelIds: selectedLabelIds,
      })
      if (result.success) {
        setIsEditing(false)
        onOpenChange(false)
      }
    })
  }

  function handleDelete() {
    if (!task) return
    startTransition(async () => {
      await deleteTaskInlineAction(projectId, task.id)
      onOpenChange(false)
    })
  }

  if (!task) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setIsEditing(false) }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Main content */}
          <div className="flex-1 p-6 min-w-0">
            <DialogHeader className="mb-4">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                />
              ) : (
                <div className="flex items-start gap-2">
                  <DialogTitle className="text-lg leading-tight">{task.title}</DialogTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={startEdit}
                    aria-label="Edit task"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                </div>
              )}
              <span className="text-xs text-muted-foreground">TASK-{task.id}</span>
            </DialogHeader>

            {/* Description */}
            {isEditing ? (
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Add a description..."
              />
            ) : (
              task.description ? (
                <RichTextViewer html={task.description} />
              ) : (
                <p className="text-sm text-muted-foreground italic">No description</p>
              )
            )}

            {/* Labels display */}
            {!isEditing && task.labels.length > 0 && (
              <div className="mt-4">
                <LabelBadges labels={task.labels} max={10} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full sm:w-56 shrink-0 border-t sm:border-t-0 sm:border-l bg-muted/30 p-4 flex flex-col gap-3">
            {/* Status */}
            <SidebarField label="Status">
              {isEditing ? (
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
              ) : (
                <span className="flex items-center gap-1.5 text-xs">
                  <span className={`size-2 rounded-full ${STATUS_CONFIG[task.status].dotClass}`} />
                  {STATUS_CONFIG[task.status].label}
                </span>
              )}
            </SidebarField>

            {/* Priority */}
            <SidebarField label="Priority">
              {isEditing ? (
                <Select value={String(priority)} onValueChange={(v) => setPriority(Number(v))}>
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
              ) : (
                <PriorityIcon priority={task.priority} showLabel />
              )}
            </SidebarField>

            {/* Labels */}
            <SidebarField label="Labels">
              {isEditing ? (
                <LabelPicker labels={labels} selected={selectedLabelIds} onChange={setSelectedLabelIds} />
              ) : (
                task.labels.length > 0 ? (
                  <LabelBadges labels={task.labels} max={5} />
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )
              )}
            </SidebarField>

            {/* Assignee */}
            <SidebarField label="Assignee">
              {isEditing ? (
                <Input
                  value={assignee ?? ""}
                  onChange={(e) => setAssignee(e.target.value || null)}
                  placeholder="Unassigned"
                  className="h-8 text-xs"
                />
              ) : (
                <span className="text-xs">{task.assignee ?? "Unassigned"}</span>
              )}
            </SidebarField>

            {/* Due date */}
            <SidebarField label="Due date">
              {isEditing ? (
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 text-xs"
                />
              ) : (
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="size-3 text-muted-foreground" aria-hidden="true" />
                  {task.due_date ?? "Not set"}
                </span>
              )}
            </SidebarField>

            {/* Claimed by */}
            {task.claimed_by && (
              <SidebarField label="Claimed by">
                <span className="flex items-center gap-1 text-xs">
                  <Bot className="size-3 text-blue-500" aria-hidden="true" />
                  {task.claimed_by}
                </span>
              </SidebarField>
            )}

            <Separator />

            <SidebarField label="Created">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" aria-hidden="true" />
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </SidebarField>

            <Separator />

            {/* Actions */}
            {isEditing ? (
              <div className="flex flex-col gap-1.5">
                <Button size="sm" onClick={handleSave} disabled={isPending || !title.trim()}>
                  Save Changes
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="size-3.5" />
                Delete Task
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
