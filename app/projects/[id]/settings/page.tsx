import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { getProject } from "@/lib/data"
import { listApiKeys } from "@/lib/api-auth"
import { createApiKeyAction, revokeApiKeyAction } from "@/lib/actions"
import { BackButton } from "@/app/components/back-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiKeyForm } from "./api-key-form"
import { ApiKeyList } from "./api-key-list"

type Props = { params: Promise<{ id: string }> }

export default async function SettingsPage({ params }: Props) {
  const { id: projectIdStr } = await params
  const projectId = Number(projectIdStr)
  const session = await auth()
  if (!session?.user?.id) notFound()

  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) notFound()

  const apiKeysRaw = await listApiKeys(projectId)
  const apiKeys = apiKeysRaw.map(k => ({ ...k }))
  const boundCreate = createApiKeyAction.bind(null, projectId)
  const boundRevoke = revokeApiKeyAction.bind(null, projectId)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <BackButton fallback={`/projects/${projectId}/tasks`} />

      <h1 className="text-xl font-semibold mb-6">{project.name} — Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create API keys for AI agents to access this project via MCP.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ApiKeyForm action={boundCreate} />
          <ApiKeyList apiKeys={apiKeys} revokeAction={boundRevoke} />
        </CardContent>
      </Card>

      <Card className="mt-6">
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
    </div>
  )
}
