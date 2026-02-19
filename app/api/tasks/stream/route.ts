import { taskEmitter } from "@/lib/emitter"
import type { TaskEvent } from "@/lib/types"

export const dynamic = "force-dynamic"

declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Set<(count: number) => void> | undefined
}

if (!globalThis.__sseClients) {
  globalThis.__sseClients = new Set()
}

function broadcastPresence() {
  const count = globalThis.__sseClients!.size
  for (const send of globalThis.__sseClients!) {
    send(count)
  }
}

export async function GET() {
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      function write(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // controller may be closed
        }
      }

      function onTaskEvent(payload: TaskEvent) {
        write(`event: task_event\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      function sendPresence(count: number) {
        write(`event: presence\ndata: ${JSON.stringify({ count })}\n\n`)
      }

      globalThis.__sseClients!.add(sendPresence)
      taskEmitter.on("task_event", onTaskEvent)
      broadcastPresence()

      const heartbeat = setInterval(() => {
        write(": heartbeat\n\n")
      }, 20_000)

      cleanup = () => {
        clearInterval(heartbeat)
        taskEmitter.off("task_event", onTaskEvent)
        globalThis.__sseClients!.delete(sendPresence)
        broadcastPresence()
      }
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
