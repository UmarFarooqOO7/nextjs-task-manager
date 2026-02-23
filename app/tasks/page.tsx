import { Suspense } from "react"
import Link from "next/link"
import { getTasksPage, searchTasks } from "@/lib/data"
import { toggleTaskAction, deleteTaskListAction, reorderTasksAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { TaskList } from "@/app/components/task-list"
import { SearchInput } from "@/app/components/search-input"
import { ViewToggle } from "@/app/components/view-toggle"
import { Plus, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react"

const PER_PAGE = 10

type Props = {
  searchParams: Promise<{
    page?: string
    q?: string
    priority?: string
    sort?: string
  }>
}

export default async function TasksPage({ searchParams }: Props) {
  const { page: pageParam, q = "", priority: priorityParam, sort } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const priorityFilter = Number(priorityParam) || 0

  // Full-text search bypasses pagination
  let tasks, total: number, totalPages: number, safePage: number
  if (q) {
    const results = searchTasks(q)
    tasks = results
    total = results.length
    totalPages = 1
    safePage = 1
  } else {
    const result = getTasksPage(page, PER_PAGE, { priority: priorityFilter || undefined, sort })
    tasks = result.tasks
    total = result.total
    totalPages = Math.ceil(total / PER_PAGE)
    safePage = Math.min(page, Math.max(1, totalPages))
  }

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
    return `/tasks${s ? `?${s}` : ""}`
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Tasks</h1>
        <div className="flex items-center gap-2">
          <ViewToggle active="list" />
          <Button asChild size="sm">
            <Link href="/tasks/new">
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3">
        <Suspense fallback={<div className="h-9 w-full rounded-md bg-muted animate-pulse" />}>
          <SearchInput />
        </Suspense>

        <div className="flex flex-wrap gap-2 text-sm">
          {/* Priority filter */}
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">Priority:</span>
            {priorities.map(p => (
              <Link
                key={p.value}
                href={buildUrl({ priority: p.value, page: "" })}
                className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                  String(priorityFilter) === p.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-muted-foreground text-xs">Sort:</span>
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
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <ClipboardList className="size-10 opacity-40" />
          <p className="text-sm">
            {q ? `No tasks matching "${q}"` : total === 0 ? "No tasks yet. Create one!" : "No tasks on this page."}
          </p>
          {total > 0 && !q && (
            <Button asChild variant="outline" size="sm">
              <Link href="/tasks">Back to first page</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <TaskList
            tasks={tasks}
            query={q}
            toggleAction={toggleTaskAction}
            deleteAction={deleteTaskListAction}
            reorderAction={reorderTasksAction}
          />

          {/* Pagination — hidden during search */}
          {!q && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon" asChild disabled={safePage <= 1}>
                <Link href={safePage <= 1 ? "#" : buildUrl({ page: String(safePage - 1) })} aria-label="Previous page">
                  <ChevronLeft className="size-4" />
                </Link>
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "ghost"}
                  size="icon"
                  asChild
                >
                  <Link href={buildUrl({ page: String(p) })}>{p}</Link>
                </Button>
              ))}

              <Button variant="ghost" size="icon" asChild disabled={safePage >= totalPages}>
                <Link href={safePage >= totalPages ? "#" : buildUrl({ page: String(safePage + 1) })} aria-label="Next page">
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {q
              ? `${total} result${total !== 1 ? "s" : ""} for "${q}"`
              : `${total} task${total !== 1 ? "s" : ""} total${totalPages > 1 ? ` · page ${safePage} of ${totalPages}` : ""}`}
          </p>
        </>
      )}
    </div>
  )
}
