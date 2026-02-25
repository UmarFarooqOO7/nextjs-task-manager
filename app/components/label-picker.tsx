"use client"

import { useState } from "react"
import { Check, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { Label } from "@/lib/types"

type Props = {
  labels: Label[]
  selected: number[]
  onChange: (ids: number[]) => void
}

export function LabelPicker({ labels, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const selectedLabels = labels.filter(l => selected.includes(l.id))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-start gap-1.5 h-8 text-xs font-normal">
          <Tag className="size-3" aria-hidden="true" />
          {selectedLabels.length > 0 ? (
            <span className="flex items-center gap-1 truncate">
              {selectedLabels.slice(0, 2).map(l => (
                <span
                  key={l.id}
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
              {selectedLabels.length > 2 && (
                <span className="text-muted-foreground">+{selectedLabels.length - 2}</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Labels</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {labels.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground text-center">
            No labels yet. Create them in project settings.
          </p>
        ) : (
          <div className="flex flex-col">
            {labels.map(label => (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-left truncate">{label.name}</span>
                <Check className={cn("size-3.5 shrink-0", selected.includes(label.id) ? "opacity-100" : "opacity-0")} />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function LabelBadges({ labels, max = 3 }: { labels: Label[]; max?: number }) {
  if (labels.length === 0) return null
  const shown = labels.slice(0, max)
  const extra = labels.length - max
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {shown.map(l => (
        <span
          key={l.id}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white leading-none"
          style={{ backgroundColor: l.color }}
        >
          {l.name}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] text-muted-foreground">+{extra}</span>
      )}
    </span>
  )
}
