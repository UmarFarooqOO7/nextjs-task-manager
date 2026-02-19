import { taskEmitter } from "@/lib/emitter"
import type { TaskEvent } from "@/lib/types"

export const dynamic = "force-dynamic"

type Client = { send: (chunk: string) => void; actor: string }

declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Map<string, Client> | undefined
}

if (!globalThis.__sseClients) {
  globalThis.__sseClients = new Map()
}

function broadcastPresence() {
  const roster = Array.from(globalThis.__sseClients!.values()).map(c => c.actor)
  const data = `event: presence\ndata: ${JSON.stringify({ roster })}\n\n`
  for (const { send } of globalThis.__sseClients!.values()) {
    send(data)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const actor = url.searchParams.get("actor") ?? "Someone"
  const clientId = crypto.randomUUID()
  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      function write(chunk: string) {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // controller may already be closed
        }
      }

      function onTaskEvent(payload: TaskEvent) {
        write(`event: task_event\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      globalThis.__sseClients!.set(clientId, { send: write, actor })
      taskEmitter.on("task_event", onTaskEvent)
      broadcastPresence()

      const heartbeat = setInterval(() => {
        write(": heartbeat\n\n")
      }, 20_000)

      cleanup = () => {
        clearInterval(heartbeat)
        taskEmitter.off("task_event", onTaskEvent)
        globalThis.__sseClients!.delete(clientId)
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
