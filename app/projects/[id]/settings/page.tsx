import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getProject, getLabels } from "@/lib/data"
import { BackButton } from "@/app/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { LabelManager } from "./label-manager"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const project = await getProject(Number(id))
  return { title: project ? `Settings — ${project.name} — Taskflow` : "Settings — Taskflow" }
}

export default async function SettingsPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackButton fallback={`/projects/${projectId}/board`} />

      <h1 className="text-2xl font-bold tracking-tight mb-6">{project.name} — Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Labels</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create labels to categorize and filter tasks on your board.
          </p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <LabelsContent projectId={projectId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function LabelsContent({ projectId }: { projectId: number }) {
  const labels = await getLabels(projectId)
  return <LabelManager labels={labels.map(l => ({ ...l }))} projectId={projectId} />
}
