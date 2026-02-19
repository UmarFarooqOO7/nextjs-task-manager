"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { generateName } from "@/lib/names"
import type { TaskEvent } from "@/lib/types"

function getOrCreateActor(): string {
  const match = document.cookie.match(/(?:^|;\s*)actor=([^;]+)/)
  if (match) return decodeURIComponent(match[1])
  const name = generateName()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `actor=${encodeURIComponent(name)}; expires=${expires}; path=/`
  return name
}

function toastMessage(event: TaskEvent): string {
  switch (event.type) {
    case "created":  return `${event.actor} created "${event.taskTitle}"`
    case "updated":  return `${event.actor} updated "${event.taskTitle}"`
    case "deleted":  return `${event.actor} deleted "${event.taskTitle}"`
    case "toggled":  return `${event.actor} toggled "${event.taskTitle}"`
    case "reordered": return `${event.actor} reordered tasks`
  }
}

export function TaskRealtime() {
  const router = useRouter()
  const actorRef = useRef<string>("")

  useEffect(() => {
    actorRef.current = getOrCreateActor()

    let es: EventSource
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      const actor = encodeURIComponent(actorRef.current)
      es = new EventSource(`/api/tasks/stream?actor=${actor}`)

      es.addEventListener("task_event", (e: MessageEvent) => {
        const payload: TaskEvent = JSON.parse(e.data)
        router.refresh()
        // Dispatch for activity feed
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
