import { createMcpHandler, withMcpAuth } from "mcp-handler"
import { z } from "zod"
import { validateOAuthToken, updateTokenProject } from "@/lib/oauth"
import dbClient, { dbReady } from "@/lib/db"
import {
  getTasks,
  searchTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  claimTask,
  getComments,
  createComment,
  getProject,
  getProjectsByOwner,
  createProject as createProjectData,
  deleteProject,
  updateProject,
  getLabels,
} from "@/lib/data"
import { emitTaskEvent } from "@/lib/emitter"
import type { TaskStatus } from "@/lib/types"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"

function getAuth(authInfo?: AuthInfo): { projectId: number; agentName: string; userId: string; token: string } {
  const projectId = authInfo?.extra?.projectId as number | undefined
  const agentName = authInfo?.extra?.agentName as string | undefined
  const userId = authInfo?.clientId
  const token = authInfo?.token
  if (!projectId || !agentName || !userId || !token) {
    throw new Error("Not authenticated.")
  }
  return { projectId, agentName, userId, token }
}

const handler = createMcpHandler(
  (server) => {
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
        try {
          const { projectId } = getAuth(authInfo)
          let tasks = q
            ? await searchTasks(projectId, q)
            : await getTasks(projectId)
          if (status) tasks = tasks.filter(t => t.status === status)
          if (priority) tasks = tasks.filter(t => t.priority === priority)

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(tasks.map(t => ({
                id: t.id, title: t.title, description: t.description,
                status: t.status, priority: t.priority, due_date: t.due_date,
                completed: !!t.completed, created_at: t.created_at,
                assignee: t.assignee, claimed_by: t.claimed_by,
              })), null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "search_tasks",
      {
        title: "Search Tasks",
        description: "Search for tasks by title or description in the current project.",
        inputSchema: {
          q: z.string().min(1).describe("Search query (title or description)"),
          status: z.enum(["todo", "in_progress", "done"]).optional().describe("Filter by task status"),
          priority: z.number().int().min(0).max(3).optional().describe("Filter by priority (1=low, 2=medium, 3=high)"),
        },
      },
      async ({ q, status, priority }, { authInfo }) => {
        try {
          const { projectId } = getAuth(authInfo)
          let tasks = await searchTasks(projectId, q)
          if (status) tasks = tasks.filter(t => t.status === status)
          if (priority) tasks = tasks.filter(t => t.priority === priority)

          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(tasks.map(t => ({
                id: t.id, title: t.title, description: t.description,
                status: t.status, priority: t.priority, due_date: t.due_date,
                completed: !!t.completed, created_at: t.created_at,
                assignee: t.assignee, claimed_by: t.claimed_by,
              })), null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "get_project",
      {
        title: "Get Project",
        description: "Get details of the current project (name, description, creation date).",
        inputSchema: {
          verbose: z.boolean().optional().describe("Include full description (default true)"),
        },
      },
      async (_args, { authInfo }) => {
        try {
          const { projectId } = getAuth(authInfo)
          const project = await getProject(projectId)
          if (!project) {
            return { content: [{ type: "text" as const, text: "Project not found." }], isError: true }
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                id: project.id, name: project.name, description: project.description,
                created_at: project.created_at,
              }, null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "list_labels",
      {
        title: "List Labels",
        description: "List all labels available in the project for tagging tasks.",
        inputSchema: {
          verbose: z.boolean().optional().describe("Include color codes (default true)"),
        },
      },
      async (_args, { authInfo }) => {
        try {
          const { projectId } = getAuth(authInfo)
          const labels = await getLabels(projectId)
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(labels.map(l => ({
                id: l.id, name: l.name, color: l.color,
              })), null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "get_task",
      {
        title: "Get Task",
        description: "Get details of a specific task by ID.",
        inputSchema: { task_id: z.number().int().describe("The task ID") },
      },
      async ({ task_id }, { authInfo }) => {
        try {
          const { projectId } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                id: task.id, title: task.title, description: task.description,
                status: task.status, priority: task.priority, due_date: task.due_date,
                completed: !!task.completed, created_at: task.created_at,
                assignee: task.assignee, claimed_by: task.claimed_by,
              }, null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

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
          assignee: z.string().nullable().optional().describe("Assignee name or null"),
        },
      },
      async ({ title, description, priority, due_date, status, assignee }, { authInfo }) => {
        try {
          const { projectId, agentName } = getAuth(authInfo)
          const result = await createTask({
            title, description: description ?? "", priority: priority ?? 0,
            due_date: due_date ?? null, status: status as TaskStatus | undefined, project_id: projectId,
            assignee: assignee ?? null,
          })
          const taskId = Number(result.lastInsertRowid)
          emitTaskEvent({ type: "created", taskId, taskTitle: title, actor: `${agentName} (agent)`, projectId })
          return { content: [{ type: "text" as const, text: JSON.stringify({ id: taskId, title, status: status ?? "todo" }) }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

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
          status: z.enum(["todo", "in_progress", "done"]).optional().describe("New status"),
          assignee: z.string().nullable().optional().describe("New assignee name or null to unassign"),
        },
      },
      async ({ task_id, title, description, priority, due_date, completed, status, assignee }, { authInfo }) => {
        try {
          const { projectId, agentName } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          const newCompleted = completed !== undefined
            ? (completed ? 1 : 0)
            : (status ? (status === "done" ? 1 : 0) : task.completed)
          await updateTask(task_id, {
            title: title ?? task.title, description: description ?? task.description,
            completed: newCompleted as 0 | 1,
            priority: priority ?? task.priority, due_date: due_date !== undefined ? due_date : task.due_date,
            assignee: assignee !== undefined ? assignee : task.assignee,
          })
          if (status && status !== task.status) {
            await moveTask(task_id, status as TaskStatus, task.position)
          }
          emitTaskEvent({ type: "updated", taskId: task_id, taskTitle: title ?? task.title, actor: `${agentName} (agent)`, projectId })
          return { content: [{ type: "text" as const, text: `Task ${task_id} updated successfully.` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "complete_task",
      {
        title: "Complete Task",
        description: "Mark a task as completed.",
        inputSchema: { task_id: z.number().int().describe("The task ID to complete") },
      },
      async ({ task_id }, { authInfo }) => {
        try {
          const { projectId, agentName } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          if (!task.completed) {
            await updateTask(task_id, {
              title: task.title, description: task.description,
              completed: 1, priority: task.priority, due_date: task.due_date,
              assignee: task.assignee,
            })
          }
          if (task.status !== "done") await moveTask(task_id, "done", task.position)
          emitTaskEvent({ type: "toggled", taskId: task_id, taskTitle: task.title, actor: `${agentName} (agent)`, projectId })
          return { content: [{ type: "text" as const, text: `Task "${task.title}" marked as completed.` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "delete_task",
      {
        title: "Delete Task",
        description: "Delete a task permanently.",
        inputSchema: { task_id: z.number().int().describe("The task ID to delete") },
      },
      async ({ task_id }, { authInfo }) => {
        try {
          const { projectId, agentName } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          await deleteTask(task_id)
          emitTaskEvent({ type: "deleted", taskId: task_id, taskTitle: task.title, actor: `${agentName} (agent)`, projectId })
          return { content: [{ type: "text" as const, text: `Task "${task.title}" deleted.` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "claim_task",
      {
        title: "Claim Task",
        description: "Claim a task so others know you are working on it.",
        inputSchema: { task_id: z.number().int().describe("The task ID to claim") },
      },
      async ({ task_id }, { authInfo }) => {
        try {
          const { projectId, agentName } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          await claimTask(task_id, agentName)
          emitTaskEvent({ type: "updated", taskId: task_id, taskTitle: task.title, actor: `${agentName} (agent)`, projectId })
          return { content: [{ type: "text" as const, text: `Task "${task.title}" claimed by ${agentName}.` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

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
        try {
          const { projectId, agentName } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          await createComment({ task_id, author: agentName, author_type: "agent", body })
          emitTaskEvent({ type: "updated", taskId: task_id, taskTitle: task.title, actor: `${agentName} (agent)`, projectId })
          return { content: [{ type: "text" as const, text: `Comment added to task "${task.title}".` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "list_comments",
      {
        title: "List Comments",
        description: "List all comments on a task.",
        inputSchema: { task_id: z.number().int().describe("The task ID") },
      },
      async ({ task_id }, { authInfo }) => {
        try {
          const { projectId } = getAuth(authInfo)
          const task = await getTask(task_id)
          if (!task || task.project_id !== projectId) {
            return { content: [{ type: "text" as const, text: "Task not found or access denied." }], isError: true }
          }
          const comments = await getComments(task_id)
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(comments.map(c => ({
                id: c.id, author: c.author, author_type: c.author_type,
                body: c.body, created_at: c.created_at,
              })), null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "list_projects",
      {
        title: "List Projects",
        description: "List all projects owned by the authenticated user.",
        inputSchema: {},
      },
      async (_args, { authInfo }) => {
        try {
          const { userId } = getAuth(authInfo)
          const projects = await getProjectsByOwner(userId)
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(projects.map(p => ({
                id: p.id, name: p.name, description: p.description, created_at: p.created_at,
              })), null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "search_projects",
      {
        title: "Search Projects",
        description: "Search for projects by name or description.",
        inputSchema: {
          q: z.string().min(1).describe("Search query (name or description)"),
        },
      },
      async ({ q }, { authInfo }) => {
        try {
          const { userId } = getAuth(authInfo)
          const projects = await getProjectsByOwner(userId)
          const query = q.toLowerCase()
          const results = projects.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
          )
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify(results.map(p => ({
                id: p.id, name: p.name, description: p.description, created_at: p.created_at,
              })), null, 2),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "create_project",
      {
        title: "Create Project",
        description: "Create a new project and optionally switch to it.",
        inputSchema: {
          name: z.string().min(1).describe("Project name"),
          description: z.string().optional().describe("Project description"),
          switch_to: z.boolean().optional().describe("Switch to the new project after creation (default: true)"),
        },
      },
      async ({ name, description, switch_to }, { authInfo }) => {
        try {
          const { userId, token } = getAuth(authInfo)
          const result = await createProjectData({ name, description: description ?? "", owner_id: userId })
          const projectId = Number(result.lastInsertRowid)
          if (switch_to !== false) {
            await updateTokenProject(token, projectId)
          }
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({ id: projectId, name, switched: switch_to !== false }),
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "update_project",
      {
        title: "Update Project",
        description: "Update the current project's name or description.",
        inputSchema: {
          name: z.string().optional().describe("New project name"),
          description: z.string().optional().describe("New project description"),
        },
      },
      async ({ name, description }, { authInfo }) => {
        try {
          const { projectId } = getAuth(authInfo)
          await updateProject(projectId, { name, description })
          return { content: [{ type: "text" as const, text: `Project ${projectId} updated.` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "delete_project",
      {
        title: "Delete Project",
        description: "Permanently delete a project and all its tasks, comments, and labels.",
        inputSchema: {
          project_id: z.number().int().describe("The project ID to delete"),
        },
      },
      async ({ project_id }, { authInfo }) => {
        try {
          const { userId } = getAuth(authInfo)
          const project = await getProject(project_id)
          if (!project) {
            return { content: [{ type: "text" as const, text: "Project not found." }], isError: true }
          }
          const userProjects = await getProjectsByOwner(userId)
          if (!userProjects.some(p => p.id === project_id)) {
            return { content: [{ type: "text" as const, text: "Access denied — you don't own this project." }], isError: true }
          }
          await deleteProject(project_id)
          return { content: [{ type: "text" as const, text: `Project "${project.name}" (ID: ${project_id}) deleted permanently.` }] }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )

    server.registerTool(
      "switch_project",
      {
        title: "Switch Project",
        description: "Switch the active project for all subsequent tool calls.",
        inputSchema: {
          project_id: z.number().int().describe("The project ID to switch to"),
        },
      },
      async ({ project_id }, { authInfo }) => {
        try {
          const { userId, token } = getAuth(authInfo)
          const project = await getProject(project_id)
          if (!project) {
            return { content: [{ type: "text" as const, text: "Project not found." }], isError: true }
          }
          // Verify ownership
          const userProjects = await getProjectsByOwner(userId)
          if (!userProjects.some(p => p.id === project_id)) {
            return { content: [{ type: "text" as const, text: "Access denied — you don't own this project." }], isError: true }
          }
          await updateTokenProject(token, project_id)
          return {
            content: [{
              type: "text" as const,
              text: `Switched to project "${project.name}" (ID: ${project_id}). All subsequent tool calls will use this project.`,
            }],
          }
        } catch (e) {
          return { content: [{ type: "text" as const, text: String(e) }], isError: true }
        }
      }
    )
  },
  { capabilities: {} },
  { basePath: "/api/mcp", maxDuration: 60 }
)

// Verify OAuth token and return AuthInfo for mcp-handler's AsyncLocalStorage context
async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined

  const oauthResult = await validateOAuthToken(bearerToken)
  if (!oauthResult) return undefined

  // Resolve projectId — set at authorize time, fallback to user's first project
  let projectId = oauthResult.projectId
  if (!projectId) {
    await dbReady
    const result = await dbClient.execute({
      sql: "SELECT id FROM projects WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1",
      args: [oauthResult.userId],
    })
    if (result.rows.length === 0) return undefined
    projectId = result.rows[0].id as number
  }

  // Look up user name
  await dbReady
  const userResult = await dbClient.execute({
    sql: "SELECT name FROM users WHERE id = ?",
    args: [oauthResult.userId],
  })
  const agentName = userResult.rows.length > 0
    ? (userResult.rows[0].name as string)
    : "OAuth User"

  return {
    token: bearerToken,
    clientId: oauthResult.userId,
    scopes: oauthResult.scope ? [oauthResult.scope] : ["mcp:tools"],
    extra: { projectId, agentName },
  }
}

// Wrap handler with mcp-handler's built-in auth (handles 401, WWW-Authenticate, AsyncLocalStorage)
const authedHandler = withMcpAuth(handler, verifyToken, { required: true })

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE }
