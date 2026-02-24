import { createMcpHandler } from "mcp-handler"
import { z } from "zod"
import { validateApiKey } from "@/lib/api-auth"
import {
  getTasksPage,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  getComments,
  createComment,
} from "@/lib/data"
import { emitTaskEvent } from "@/lib/emitter"
import type { TaskStatus } from "@/lib/types"

const VALID_STATUSES: TaskStatus[] = ["todo", "in_progress", "done"]

const handler = createMcpHandler(
  (server) => {
    // ── list_tasks ──────────────────────────────────────────────────────
    server.registerTool(
      "list_tasks",
      {
        title: "List Tasks",
        description: "List tasks in the project. Supports filtering by status, priority, and text search.",
        inputSchema: {
          status: z.enum(["todo", "in_progress", "done"]).optional().describe("Filter by task status"),
          priority: z.number().int().min(0).max(3).optional().describe("Filter by priority (1=low, 2=medium, 3=high)"),
          q: z.string().optional().describe("Full-text search query"),
        },
      },
      async ({ status, priority, q }, { authInfo }) => {
        const projectId = (authInfo as { projectId: number }).projectId
        const opts: { q?: string; priority?: number } = {}
        if (q) opts.q = q
        if (priority) opts.priority = priority

        let result = await getTasksPage(projectId, 1, 100, opts)
        let tasks = result.tasks

        if (status) {
          tasks = tasks.filter(t => t.status === status)
        }

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(tasks.map(t => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
              completed: !!t.completed,
              created_at: t.created_at,
            })), null, 2),
          }],
        }
      }
    )

    // ── get_task ────────────────────────────────────────────────────────
    server.registerTool(
      "get_task",
      {
        title: "Get Task",
        description: "Get details of a specific task by ID.",
        inputSchema: {
          task_id: z.number().int().describe("The task ID"),
        },
      },
      async ({ task_id }, { authInfo }) => {
        const projectId = (authInfo as { projectId: number }).projectId
        const task = await getTask(task_id)
        if (!task || task.project_id !== projectId) {
          return { content: [{ type: "text" as const, text: "Task not found or access denied." }] }
        }
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              due_date: task.due_date,
              completed: !!task.completed,
              created_at: task.created_at,
            }, null, 2),
          }],
        }
      }
    )

    // ── create_task ────────────────────────────────────────────────────
    server.registerTool(
      "create_task",
      {
        title: "Create Task",
        description: "Create a new task in the project.",
        inputSchema: {
          title: z.string().min(1).describe("Task title"),
          description: z.string().optional().describe("Task description"),
          priority: z.number().int().min(0).max(3).optional().describe("Priority: 0=none, 1=low, 2=medium, 3=high"),
          due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
          status: z.enum(["todo", "in_progress", "done"]).optional().describe("Initial status (default: todo)"),
        },
      },
      async ({ title, description, priority, due_date, status }, { authInfo }) => {
        const { projectId, agentName } = authInfo as { projectId: number; agentName: string }
        const result = await createTask({
          title,
          description: description ?? "",
          priority: priority ?? 0,
          due_date: due_date ?? null,
          status: status as TaskStatus | undefined,
          project_id: projectId,
        })
        const taskId = Number(result.lastInsertRowid)
        emitTaskEvent({ type: "created", taskId, taskTitle: title, actor: `${agentName} (agent)` })
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ id: taskId, title, status: status ?? "todo" }) }],
        }
      }
    )

    // ── update_task ────────────────────────────────────────────────────
    server.registerTool(
      "update_task",
      {
        title: "Update Task",
        description: "Update an existing task's fields.",
        inputSchema: {
          task_id: z.number().int().describe("The task ID to update"),
          title: z.string().optional().describe("New title"),
          description: z.string().optional().describe("New description"),
          priority: z.number().int().min(0).max(3).optional().describe("New priority"),
          due_date: z.string().nullable().optional().describe("New due date (YYYY-MM-DD) or null to clear"),
          completed: z.boolean().optional().describe("Mark as completed or not"),
        },
      },
      async ({ task_id, title, description, priority, due_date, completed }, { authInfo }) => {
        const { projectId, agentName } = authInfo as { projectId: number; agentName: string }
        const task = await getTask(task_id)
        if (!task || task.project_id !== projectId) {
          return { content: [{ type: "text" as const, text: "Task not found or access denied." }] }
        }
        await updateTask(task_id, {
          title: title ?? task.title,
          description: description ?? task.description,
          completed: (completed !== undefined ? (completed ? 1 : 0) : task.completed) as 0 | 1,
          priority: priority ?? task.priority,
          due_date: due_date !== undefined ? due_date : task.due_date,
        })
        emitTaskEvent({ type: "updated", taskId: task_id, taskTitle: title ?? task.title, actor: `${agentName} (agent)` })
        return {
          content: [{ type: "text" as const, text: `Task ${task_id} updated successfully.` }],
        }
      }
    )

    // ── complete_task ──────────────────────────────────────────────────
    server.registerTool(
      "complete_task",
      {
        title: "Complete Task",
        description: "Mark a task as completed.",
        inputSchema: {
          task_id: z.number().int().describe("The task ID to complete"),
        },
      },
      async ({ task_id }, { authInfo }) => {
        const { projectId, agentName } = authInfo as { projectId: number; agentName: string }
        const task = await getTask(task_id)
        if (!task || task.project_id !== projectId) {
          return { content: [{ type: "text" as const, text: "Task not found or access denied." }] }
        }
        if (!task.completed) {
          await toggleTask(task_id)
        }
        emitTaskEvent({ type: "toggled", taskId: task_id, taskTitle: task.title, actor: `${agentName} (agent)` })
        return {
          content: [{ type: "text" as const, text: `Task "${task.title}" marked as completed.` }],
        }
      }
    )

    // ── delete_task ────────────────────────────────────────────────────
    server.registerTool(
      "delete_task",
      {
        title: "Delete Task",
        description: "Delete a task permanently.",
        inputSchema: {
          task_id: z.number().int().describe("The task ID to delete"),
        },
      },
      async ({ task_id }, { authInfo }) => {
        const { projectId, agentName } = authInfo as { projectId: number; agentName: string }
        const task = await getTask(task_id)
        if (!task || task.project_id !== projectId) {
          return { content: [{ type: "text" as const, text: "Task not found or access denied." }] }
        }
        await deleteTask(task_id)
        emitTaskEvent({ type: "deleted", taskId: task_id, taskTitle: task.title, actor: `${agentName} (agent)` })
        return {
          content: [{ type: "text" as const, text: `Task "${task.title}" deleted.` }],
        }
      }
    )

    // ── add_comment ────────────────────────────────────────────────────
    server.registerTool(
      "add_comment",
      {
        title: "Add Comment",
        description: "Add a comment to a task.",
        inputSchema: {
          task_id: z.number().int().describe("The task ID to comment on"),
          body: z.string().min(1).describe("The comment text"),
        },
      },
      async ({ task_id, body }, { authInfo }) => {
        const { projectId, agentName } = authInfo as { projectId: number; agentName: string }
        const task = await getTask(task_id)
        if (!task || task.project_id !== projectId) {
          return { content: [{ type: "text" as const, text: "Task not found or access denied." }] }
        }
        await createComment({ task_id, author: agentName, author_type: "agent", body })
        return {
          content: [{ type: "text" as const, text: `Comment added to task "${task.title}".` }],
        }
      }
    )

    // ── list_comments ──────────────────────────────────────────────────
    server.registerTool(
      "list_comments",
      {
        title: "List Comments",
        description: "List all comments on a task.",
        inputSchema: {
          task_id: z.number().int().describe("The task ID"),
        },
      },
      async ({ task_id }, { authInfo }) => {
        const projectId = (authInfo as { projectId: number }).projectId
        const task = await getTask(task_id)
        if (!task || task.project_id !== projectId) {
          return { content: [{ type: "text" as const, text: "Task not found or access denied." }] }
        }
        const comments = await getComments(task_id)
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(comments.map(c => ({
              id: c.id,
              author: c.author,
              author_type: c.author_type,
              body: c.body,
              created_at: c.created_at,
            })), null, 2),
          }],
        }
      }
    )
  },
  {
    authenticate: async (req) => {
      const authHeader = req.headers.get("authorization")
      const result = await validateApiKey(authHeader)
      if (!result) {
        throw new Response("Unauthorized", { status: 401 })
      }
      return { projectId: result.projectId, agentName: result.agentName }
    },
  },
  {
    basePath: "/api",
    maxDuration: 60,
  }
)

export { handler as GET, handler as POST, handler as DELETE }
