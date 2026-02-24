"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { TaskEvent } from "@/lib/types"

function toastMessage(event: TaskEvent): string {
  switch (event.type) {
    case "created":  return `${event.actor} created "${event.taskTitle}"`
    case "updated":  return `${event.actor} updated "${event.taskTitle}"`
    case "deleted":  return `${event.actor} deleted "${event.taskTitle}"`
    case "toggled":  return `${event.actor} toggled "${event.taskTitle}"`
    case "reordered": return `${event.actor} reordered tasks`
    case "moved": return `${event.actor} moved "${event.taskTitle}"`
  }
}

export function TaskRealtime({ userName }: { userName?: string }) {
  const router = useRouter()
  const actorRef = useRef<string>(userName ?? "Someone")

  useEffect(() => {
    let es: EventSource
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      const actor = encodeURIComponent(actorRef.current)
      es = new EventSource(`/api/tasks/stream?actor=${actor}`)

      es.addEventListener("task_event", (e: MessageEvent) => {
        const payload: TaskEvent = JSON.parse(e.data)
        router.refresh()
        window.dispatchEvent(new CustomEvent("sse:task_event", { detail: payload }))
        if (payload.actor !== actorRef.current) {
          toast(toastMessage(payload))
        }
      })

      es.addEventListener("presence", (e: MessageEvent) => {
        const data = JSON.parse(e.data) as { roster: string[] }
        window.dispatchEvent(new CustomEvent("sse:presence", { detail: data }))
      })

      es.onerror = () => {
        es.close()
        retryTimeout = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      clearTimeout(retryTimeout)
      es?.close()
    }
  }, [router])

  return null
}
