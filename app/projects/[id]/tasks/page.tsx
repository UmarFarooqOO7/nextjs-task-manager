import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getTasksPage, searchTasks } from "@/lib/data"
import { toggleTaskAction, deleteTaskListAction, reorderTasksAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/app/components/task-list"
import { SearchInput } from "@/app/components/search-input"
import { ViewToggle } from "@/app/components/view-toggle"
import { Plus, ClipboardList, ChevronLeft, ChevronRight, Settings } from "lucide-react"

const PER_PAGE = 10

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    page?: string
    q?: string
    priority?: string
    sort?: string
  }>
}

export default async function ProjectTasksPage({ params, searchParams }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const { page: pageParam, q = "", priority: priorityParam, sort } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const priorityFilter = Number(priorityParam) || 0

  let tasks, total: number, totalPages: number, safePage: number
  if (q) {
    const results = await searchTasks(projectId, q)
    tasks = results.map(t => ({ ...t }))
    total = results.length
    totalPages = 1
    safePage = 1
  } else {
    const result = await getTasksPage(projectId, page, PER_PAGE, { priority: priorityFilter || undefined, sort })
    tasks = result.tasks.map(t => ({ ...t }))
    total = result.total
    totalPages = Math.ceil(total / PER_PAGE)
    safePage = Math.min(page, Math.max(1, totalPages))
  }

  const basePath = `/projects/${projectId}/tasks`

  const priorities = [
    { value: "", label: "All" },
    { value: "1", label: "Low" },
    { value: "2", label: "Medium" },
    { value: "3", label: "High" },
  ]

  const sorts = [
    { value: "", label: "Default" },
    { value: "due", label: "Due date" },
    { value: "created", label: "Newest" },
  ]

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (priorityFilter) params.set("priority", String(priorityFilter))
    if (sort) params.set("sort", sort)
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    const s = params.toString()
    return `${basePath}${s ? `?${s}` : ""}`
  }

  const boundToggle = toggleTaskAction.bind(null, projectId)
  const boundDeleteList = deleteTaskListAction.bind(null, projectId)
  const boundReorder = reorderTasksAction.bind(null, projectId)

  const start = (safePage - 1) * PER_PAGE + 1
  const end = Math.min(safePage * PER_PAGE, total)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} task{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="size-8" aria-label="Project settings">
            <Link href={`/projects/${projectId}/settings`}>
              <Settings className="size-4" />
            </Link>
          </Button>
          <ViewToggle active="list" projectId={projectId} />
          <Button asChild size="sm">
            <Link href={`${basePath}/new`}>
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3">
        <Suspense fallback={<div className="h-9 w-full rounded-md bg-muted animate-pulse" />}>
          <SearchInput />
        </Suspense>

        <div className="flex flex-wrap gap-2 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs font-medium">Priority:</span>
            {priorities.map(p => (
              <Link
                key={p.value}
                href={buildUrl({ priority: p.value, page: "" })}
                className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                  (priorityFilter === 0 ? "" : String(priorityFilter)) === p.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-muted-foreground text-xs font-medium">Sort:</span>
            {sorts.map(s => (
              <Link
                key={s.value}
                href={buildUrl({ sort: s.value, page: "" })}
                className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                  (sort ?? "") === s.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="size-7 opacity-40" />
          </div>
          <p className="text-sm">
            {q ? `No tasks matching "${q}"` : total === 0 ? "No tasks yet. Create one!" : "No tasks on this page."}
          </p>
          {total > 0 && !q && (
            <Button asChild variant="outline" size="sm">
              <Link href={basePath}>Back to first page</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <TaskList
            tasks={tasks}
            query={q}
            projectId={projectId}
            toggleAction={boundToggle}
            deleteAction={boundDeleteList}
            reorderAction={boundReorder}
          />

          {!q && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {start}–{end} of {total}
              </p>
              <div className="flex items-center gap-1">
                {safePage <= 1 ? (
                  <Button variant="ghost" size="icon" disabled aria-label="Previous page">
                    <ChevronLeft className="size-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" asChild aria-label="Previous page">
                    <Link href={buildUrl({ page: String(safePage - 1) })}>
                      <ChevronLeft className="size-4" />
                    </Link>
                  </Button>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === safePage ? "default" : "ghost"}
                    size="icon"
                    className="size-8"
                    asChild
                    aria-label={`Page ${p}`}
                  >
                    <Link href={buildUrl({ page: String(p) })}>{p}</Link>
                  </Button>
                ))}

                {safePage >= totalPages ? (
                  <Button variant="ghost" size="icon" disabled aria-label="Next page">
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" asChild aria-label="Next page">
                    <Link href={buildUrl({ page: String(safePage + 1) })}>
                      <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
