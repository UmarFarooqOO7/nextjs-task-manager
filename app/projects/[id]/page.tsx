import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject, getProjectStats, getActiveAgents } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { List, LayoutDashboard, Settings, Bot } from "lucide-react"

type Props = { params: Promise<{ id: string }> }

export default async function ProjectDashboardPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const stats = await getProjectStats(projectId)
  const agents = await getActiveAgents(projectId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <Button variant="ghost" size="icon" asChild className="size-8" aria-label="Project settings">
          <Link href={`/projects/${projectId}/settings`}>
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground mb-6">{project.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {([
          ["Total", stats.total],
          ["Todo", stats.todo],
          ["In Progress", stats.in_progress],
          ["Done", stats.done],
        ] as const).map(([label, count]) => (
          <Card key={label}>
            <CardContent className="px-3 py-3 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button asChild variant="outline" className="h-auto py-3">
          <Link href={`/projects/${projectId}/tasks`} className="flex items-center gap-2">
            <List className="size-4" />
            Task List
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-3">
          <Link href={`/projects/${projectId}/board`} className="flex items-center gap-2">
            <LayoutDashboard className="size-4" />
            Board View
          </Link>
        </Button>
      </div>

      {/* Active agents */}
      {agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="size-4" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {agents.map(a => (
                <li key={a.key_prefix} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Last active {new Date(a.last_used_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
