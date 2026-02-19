"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Activity } from "lucide-react"
import type { TaskEvent } from "@/lib/types"

type FeedEntry = TaskEvent & { receivedAt: number }

const MAX_EVENTS = 20

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
}

export function ActivityFeedButton() {
  const [events, setEvents] = useState<FeedEntry[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    function handler(e: Event) {
      const payload = (e as CustomEvent<TaskEvent>).detail
      setEvents(prev => [{ ...payload, receivedAt: Date.now() }, ...prev].slice(0, MAX_EVENTS))
    }
    window.addEventListener("sse:task_event", handler)
    return () => window.removeEventListener("sse:task_event", handler)
  }, [])

  // Tick every 10s to refresh relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  void tick // consumed to trigger re-render

  return (
    <Sheet>
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
        <ul className="mt-4 flex flex-col gap-3 overflow-y-auto">
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground">No activity yet. Changes from any tab appear here.</p>
          )}
          {events.map((ev, i) => (
            <li key={i} className="flex flex-col gap-0.5 border-b pb-3 text-sm last:border-0">
              <span className="font-medium">{ev.actor}</span>
              <span className="text-muted-foreground">
                {TYPE_LABELS[ev.type] ?? ev.type}
                {ev.taskTitle ? <> &ldquo;{ev.taskTitle}&rdquo;</> : null}
              </span>
              <span className="text-xs text-muted-foreground">{relativeTime(ev.receivedAt)}</span>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
