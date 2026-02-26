import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getProject, getProjectStats, getActiveAgents } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LayoutDashboard, Settings, Bot, Zap } from "lucide-react"
import { BackButton } from "@/app/components/back-button"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(Number(id))
  return { title: project ? `${project.name} — Taskflow` : "Project — Taskflow" }
}

const STAT_CARDS = [
  { key: "total", label: "Total Tasks", borderClass: "border-l-blue-500", textClass: "text-blue-500" },
  { key: "todo", label: "Todo", borderClass: "border-l-gray-400", textClass: "text-gray-500" },
  { key: "in_progress", label: "In Progress", borderClass: "border-l-amber-400", textClass: "text-amber-500" },
  { key: "done", label: "Done", borderClass: "border-l-green-400", textClass: "text-green-500" },
] as const

export default async function ProjectDashboardPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BackButton fallback="/projects" />
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{project.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" asChild aria-label="Project settings">
          <Link href={`/projects/${projectId}/settings`}>
            <Settings className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Button asChild size="sm">
          <Link href={`/projects/${projectId}/board`}>
            <LayoutDashboard className="size-3.5" />
            Board
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${projectId}/settings`}>
            <Settings className="size-3.5" />
            Settings
          </Link>
        </Button>
      </div>

      {/* Stats + Progress */}
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats projectId={projectId} />
      </Suspense>

      {/* Active agents */}
      <Suspense fallback={null}>
        <ActiveAgents projectId={projectId} />
      </Suspense>
    </div>
  )
}

async function DashboardStats({ projectId }: { projectId: number }) {
  const stats = await getProjectStats(projectId)

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {STAT_CARDS.map(({ key, label, borderClass, textClass }) => (
          <Card key={key} className={`border-l-4 ${borderClass}`}>
            <CardContent className="px-4 py-3">
              <p className={`text-2xl font-bold ${textClass}`}>{stats[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.total > 0 && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round((stats.done / stats.total) * 100)}% complete
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
              {stats.done > 0 && (
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(stats.done / stats.total) * 100}%` }}
                />
              )}
              {stats.in_progress > 0 && (
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(stats.in_progress / stats.total) * 100}%` }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

async function ActiveAgents({ projectId }: { projectId: number }) {
  const agents = await getActiveAgents(projectId)
  if (agents.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="size-4 text-blue-500" />
          Active Agents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2.5">
          {agents.map(a => (
            <li key={a.key_prefix} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-blue-500/10">
                  <Zap className="size-3.5 text-blue-500" />
                </div>
                <span className="font-medium">{a.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(a.last_used_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-l-4 p-4 space-y-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
