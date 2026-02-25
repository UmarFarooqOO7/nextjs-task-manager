"use client"

import { useState, useTransition } from "react"
import { Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createLabelAction, updateLabelAction, deleteLabelAction } from "@/lib/actions"
import { LABEL_COLORS } from "@/lib/constants"
import type { Label } from "@/lib/types"

type Props = {
  labels: Label[]
  projectId: number
}

export function LabelManager({ labels, projectId }: Props) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [color, setColor] = useState<string>(LABEL_COLORS[0].value)
  const [isPending, startTransition] = useTransition()

  function startEdit(label: Label) {
    setEditingId(label.id)
    setName(label.name)
    setColor(label.color)
    setIsAdding(false)
  }

  function startAdd() {
    setIsAdding(true)
    setEditingId(null)
    setName("")
    setColor(LABEL_COLORS[0].value)
  }

  function cancel() {
    setIsAdding(false)
    setEditingId(null)
    setName("")
    setColor(LABEL_COLORS[0].value)
  }

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      if (editingId) {
        await updateLabelAction(projectId, editingId, { name: name.trim(), color })
      } else {
        await createLabelAction(projectId, { name: name.trim(), color })
      }
      cancel()
    })
  }

  function handleDelete(labelId: number) {
    startTransition(async () => {
      await deleteLabelAction(projectId, labelId)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {labels.map(label => (
            <div key={label.id} className="group flex items-center gap-1.5">
              {editingId === label.id ? (
                <EditForm
                  name={name}
                  color={color}
                  onNameChange={setName}
                  onColorChange={setColor}
                  onSave={handleSave}
                  onCancel={cancel}
                  isPending={isPending}
                />
              ) : (
                <>
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit(label)}
                    aria-label={`Edit ${label.name}`}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleDelete(label.id)}
                    disabled={isPending}
                    aria-label={`Delete ${label.name}`}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <EditForm
          name={name}
          color={color}
          onNameChange={setName}
          onColorChange={setColor}
          onSave={handleSave}
          onCancel={cancel}
          isPending={isPending}
        />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={startAdd}>
          <Plus className="size-3.5" />
          Add Label
        </Button>
      )}
    </div>
  )
}

function EditForm({ name, color, onNameChange, onColorChange, onSave, onCancel, isPending }: {
  name: string
  color: string
  onNameChange: (v: string) => void
  onColorChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Label name"
        className="h-8 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave()
          if (e.key === "Escape") onCancel()
        }}
      />
      <div className="flex flex-wrap gap-1.5">
        {LABEL_COLORS.map(c => (
          <button
            key={c.value}
            type="button"
            onClick={() => onColorChange(c.value)}
            className="size-6 rounded-full border-2 transition-all"
            style={{
              backgroundColor: c.value,
              borderColor: color === c.value ? "white" : "transparent",
              boxShadow: color === c.value ? `0 0 0 2px ${c.value}` : "none",
            }}
            title={c.name}
            aria-label={`Color: ${c.name}`}
          />
        ))}
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={isPending || !name.trim()}>
          <Check className="size-3" />
          Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          <X className="size-3" />
          Cancel
        </Button>
      </div>
    </div>
  )
}
