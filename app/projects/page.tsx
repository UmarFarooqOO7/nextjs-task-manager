import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getProjectsByOwner, getProjectStats } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, FolderOpen } from "lucide-react"

export default async function ProjectsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const projects = await getProjectsByOwner(session.user.id)

  // Fetch stats for all projects in parallel
  const projectStats = await Promise.all(
    projects.map(p => getProjectStats(p.id))
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            New Project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <FolderOpen className="size-8 opacity-40" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">No projects yet</p>
            <p className="text-sm mt-1">Create your first project to start managing tasks.</p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              Create Project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project, i) => {
            const stats = projectStats[i]
            const total = stats.total || 1
            const donePercent = Math.round((stats.done / total) * 100)
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-all hover:shadow-md hover:border-primary/20 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold truncate">{project.name}</h2>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all"
                          style={{ width: `${stats.total > 0 ? donePercent : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-gray-400" />
                        {stats.todo} todo
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-amber-400" />
                        {stats.in_progress} active
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-green-400" />
                        {stats.done} done
                      </span>
                      <span className="ml-auto">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
