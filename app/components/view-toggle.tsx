"use client"

import Link from "next/link"
import { List, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

export function ViewToggle({ active, projectId }: { active: "list" | "board"; projectId: number }) {
  return (
    <div className="flex rounded-md border overflow-hidden">
      <Link
        href={`/projects/${projectId}/tasks`}
        className={cn(
          "px-3 py-1.5 transition-colors hover:bg-accent",
          active === "list" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        aria-label="List view"
      >
        <List className="size-4" />
      </Link>
      <Link
        href={`/projects/${projectId}/board`}
        className={cn(
          "px-3 py-1.5 transition-colors hover:bg-accent",
          active === "board" && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        aria-label="Board view"
      >
        <LayoutDashboard className="size-4" />
      </Link>
    </div>
  )
}
