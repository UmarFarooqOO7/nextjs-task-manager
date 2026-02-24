"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Activity, Bot, User } from "lucide-react"
import type { TaskEvent } from "@/lib/types"

type FeedEntry = TaskEvent & { receivedAt: number }
type Filter = "all" | "humans" | "agents"

const MAX_EVENTS = 20

function isAgent(actor: string) {
  return actor.endsWith("(agent)")
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const TYPE_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  toggled: "toggled",
  reordered: "reordered tasks",
  moved: "moved",
}

export function ActivityFeedButton() {
  const [events, setEvents] = useState<FeedEntry[]>([])
  const [tick, setTick] = useState(0)
  const [filter, setFilter] = useState<Filter>("all")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: Event) {
      const payload = (e as CustomEvent<TaskEvent>).detail
      setEvents(prev => [{ ...payload, receivedAt: Date.now() }, ...prev].slice(0, MAX_EVENTS))
    }
    window.addEventListener("sse:task_event", handler)
    return () => window.removeEventListener("sse:task_event", handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setTick(n => n + 1), 10_000)
    return () => clearInterval(id)
  }, [open])

  void tick

  const filtered = events.filter(ev => {
    if (filter === "agents") return isAgent(ev.actor)
    if (filter === "humans") return !isAgent(ev.actor)
    return true
  })

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Activity feed">
          <Activity className="size-4" />
          {events.length > 0 && (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-green-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Activity Feed</SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex gap-1">
          {(["all", "humans", "agents"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:bg-accent"
              }`}
            >
              {f === "all" ? "All" : f === "humans" ? "Humans" : "Agents"}
            </button>
          ))}
        </div>

        <ul className="mt-4 flex flex-col gap-3 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {events.length === 0 ? "No activity yet." : "No matching events."}
            </p>
          )}
          {filtered.map((ev) => (
            <li key={`${ev.receivedAt}-${ev.type}-${ev.taskId}`} className="flex gap-2.5 border-b pb-3 text-sm last:border-0">
              <div className="mt-0.5 shrink-0">
                {isAgent(ev.actor)
                  ? <Bot className="size-4 text-blue-500" />
                  : <User className="size-4 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{ev.actor}</span>
                <span className="text-muted-foreground">
                  {TYPE_LABELS[ev.type] ?? ev.type}
                  {ev.taskTitle ? <> &ldquo;{ev.taskTitle}&rdquo;</> : null}
                </span>
                <span className="text-xs text-muted-foreground">{relativeTime(ev.receivedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
