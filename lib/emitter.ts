import { EventEmitter } from "events"
import type { TaskEvent } from "./types"

declare global {
  // eslint-disable-next-line no-var
  var __taskEmitter: EventEmitter | undefined
}

if (!globalThis.__taskEmitter) {
  globalThis.__taskEmitter = new EventEmitter()
  globalThis.__taskEmitter.setMaxListeners(100)
}

export const taskEmitter = globalThis.__taskEmitter

export function emitTaskEvent(payload: TaskEvent): void {
  taskEmitter.emit("task_event", payload)
}
