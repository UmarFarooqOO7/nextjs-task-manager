import { getTasksBoard } from "@/lib/data"
import { KanbanBoard } from "@/app/components/kanban-board"
import { ViewToggle } from "@/app/components/view-toggle"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function BoardPage() {
  const columns = await getTasksBoard()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        <div className="flex items-center gap-2">
          <ViewToggle active="board" />
          <Button asChild size="sm">
            <Link href="/tasks/new?returnTo=/tasks/board">
              <Plus className="size-4" />
              New Task
            </Link>
          </Button>
        </div>
      </div>
      <KanbanBoard initialColumns={columns} />
    </div>
  )
}
