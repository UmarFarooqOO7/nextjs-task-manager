import Link from "next/link"
import { getTasksPage } from "@/lib/data"
import { toggleTaskAction, deleteTaskListAction } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DeleteDialog } from "@/app/components/delete-dialog"
import { Plus, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const PER_PAGE = 5

type Props = { searchParams: Promise<{ page?: string }> }

export default async function TasksPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const { tasks, total } = getTasksPage(page, PER_PAGE)
  const totalPages = Math.ceil(total / PER_PAGE)
  // clamp page to valid range after potential deletions
  const safePage = Math.min(page, Math.max(1, totalPages))

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Tasks</h1>
        <Button asChild size="sm">
          <Link href="/tasks/new">
            <Plus className="size-4" />
            New Task
          </Link>
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <ClipboardList className="size-10 opacity-40" />
          <p className="text-sm">{total === 0 ? "No tasks yet. Create one!" : "No tasks on this page."}</p>
          {total > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/tasks">Back to first page</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => {
              const boundToggle = toggleTaskAction.bind(null, task.id)
              const boundDelete = deleteTaskListAction.bind(null, task.id)

              return (
                <li key={task.id}>
                  <Card className="transition-colors hover:bg-accent/40">
                    <CardContent className="flex items-center gap-3 px-4 py-3">
                      {/* Toggle badge — submits a form styled as a badge */}
                      <form action={boundToggle} className="shrink-0">
                        <button
                          type="submit"
                          title={task.completed ? "Mark as pending" : "Mark as done"}
                          className={cn(
                            badgeVariants({ variant: task.completed ? "default" : "secondary" }),
                            "cursor-pointer transition-opacity hover:opacity-75"
                          )}
                        >
                          {task.completed ? "Done" : "Pending"}
                        </button>
                      </form>

                      {/* Title + description */}
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="truncate text-sm text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/tasks/${task.id}/edit`}>Edit</Link>
                        </Button>
                        <DeleteDialog action={boundDelete} compact />
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1">
              <Button variant="ghost" size="icon" asChild disabled={safePage <= 1}>
                <Link href={safePage <= 1 ? "#" : `/tasks?page=${safePage - 1}`} aria-label="Previous page">
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
                  <Link href={`/tasks?page=${p}`}>{p}</Link>
                </Button>
              ))}

              <Button variant="ghost" size="icon" asChild disabled={safePage >= totalPages}>
                <Link href={safePage >= totalPages ? "#" : `/tasks?page=${safePage + 1}`} aria-label="Next page">
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {total} task{total !== 1 ? "s" : ""} total · page {safePage} of {totalPages}
          </p>
        </>
      )}
    </div>
  )
}
