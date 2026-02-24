import { auth } from "@/lib/auth"
import { getProject } from "@/lib/data"
import { taskEmitter } from "@/lib/emitter"
import type { TaskEvent } from "@/lib/types"

export const dynamic = "force-dynamic"

type Client = { send: (chunk: string) => void; actor: string; projectId: number }

declare global {
  // eslint-disable-next-line no-var
  var __sseClients: Map<string, Client> | undefined
}

if (!(globalThis.__sseClients instanceof Map)) {
  globalThis.__sseClients = new Map()
}

function broadcastPresence(projectId: number) {
  const roster = Array.from(globalThis.__sseClients!.values())
    .filter(c => c.projectId === projectId)
    .map(c => c.actor)
  const data = `event: presence\ndata: ${JSON.stringify({ roster })}\n\n`
  for (const client of globalThis.__sseClients!.values()) {
    if (client.projectId === projectId) {
      client.send(data)
    }
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const url = new URL(request.url)
  const actor = url.searchParams.get("actor") ?? session.user.name ?? "Someone"
  const projectId = Number(url.searchParams.get("projectId") || 0)

  // Verify user owns the project
  if (projectId) {
    const project = await getProject(projectId)
    if (!project || project.owner_id !== session.user.id) {
      return new Response("Forbidden", { status: 403 })
    }
  }
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
        // Only send events for this client's project (or if no project scope)
        if (projectId && payload.projectId && payload.projectId !== projectId) return
        write(`event: task_event\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      globalThis.__sseClients!.set(clientId, { send: write, actor, projectId })
      taskEmitter.on("task_event", onTaskEvent)
      broadcastPresence(projectId)

      const heartbeat = setInterval(() => {
        write(": heartbeat\n\n")
      }, 20_000)

      cleanup = () => {
        clearInterval(heartbeat)
        taskEmitter.off("task_event", onTaskEvent)
        globalThis.__sseClients!.delete(clientId)
        broadcastPresence(projectId)
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
