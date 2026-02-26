import { Suspense } from "react"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { getProject, getLabels } from "@/lib/data"
import { listApiKeys } from "@/lib/api-auth"
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions"
import { BackButton } from "@/app/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiKeyForm } from "./api-key-form"
import { ApiKeyList } from "./api-key-list"
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

  const boundCreate = createApiKeyAction.bind(null, projectId)
  const boundRevoke = revokeApiKeyAction.bind(null, projectId)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BackButton fallback={`/projects/${projectId}/board`} />

      <h1 className="text-2xl font-bold tracking-tight mb-6">{project.name} — Settings</h1>

      <Tabs defaultValue="labels" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
        </TabsList>

        <TabsContent value="labels">
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
        </TabsContent>

        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create API keys for AI agents to access this project via MCP.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <ApiKeyForm action={boundCreate} />
              <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                <ApiKeysContent projectId={projectId} revokeAction={boundRevoke} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp">
          <Card>
            <CardHeader>
              <CardTitle>MCP Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add this to your AI tool&apos;s MCP configuration:
              </p>
            </CardHeader>
            <CardContent>
              <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "task-manager": {
      "url": "${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app"}/api/mcp",
      "headers": {
        "Authorization": "Bearer tm_..."
      }
    }
  }
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

async function LabelsContent({ projectId }: { projectId: number }) {
  const labels = await getLabels(projectId)
  return <LabelManager labels={labels.map(l => ({ ...l }))} projectId={projectId} />
}

async function ApiKeysContent({ projectId, revokeAction }: { projectId: number; revokeAction: (keyId: number) => Promise<void> }) {
  const apiKeysRaw = await listApiKeys(projectId)
  const apiKeys = apiKeysRaw.map(k => ({ ...k }))
  return <ApiKeyList apiKeys={apiKeys} revokeAction={revokeAction} />
}
