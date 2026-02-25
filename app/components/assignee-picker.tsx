"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCircle } from "lucide-react"

type Props = {
  value: string | null
  onChange: (value: string | null) => void
  className?: string
}

export function AssigneePicker({ value, onChange, className }: Props) {
  return (
    <Select
      value={value ?? "__none__"}
      onValueChange={(v) => onChange(v === "__none__" ? null : v)}
    >
      <SelectTrigger className={className}>
        <span className="flex items-center gap-1.5">
          <UserCircle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <SelectValue placeholder="Unassigned" />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">Unassigned</SelectItem>
        <SelectItem value="me">Me</SelectItem>
      </SelectContent>
    </Select>
  )
}
