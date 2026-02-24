"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Key, Trash2 } from "lucide-react"
import type { ApiKey } from "@/lib/types"

type Props = {
  apiKeys: ApiKey[]
  revokeAction: (keyId: number) => Promise<void>
}

export function ApiKeyList({ apiKeys, revokeAction }: Props) {
  const [isPending, startTransition] = useTransition()

  if (apiKeys.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No API keys yet. Create one to connect an AI agent.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {apiKeys.map(k => (
        <li key={k.id} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
          <Key className="size-4 text-muted-foreground shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium truncate">{k.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{k.key_prefix}...</span>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {k.last_used_at
              ? `Used ${new Date(k.last_used_at).toLocaleDateString()}`
              : "Never used"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await revokeAction(k.id)
              })
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
