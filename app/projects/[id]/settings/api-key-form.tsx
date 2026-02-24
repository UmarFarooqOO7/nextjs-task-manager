"use client"

import { useActionState, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@radix-ui/react-label"
import { SubmitButton } from "@/app/components/submit-button"
import { Copy, Check } from "lucide-react"
import type { ActionState } from "@/lib/types"

type KeyState = ActionState & { generatedKey?: string }

type Props = {
  action: (prevState: KeyState, formData: FormData) => Promise<KeyState>
}

export function ApiKeyForm({ action }: Props) {
  const [state, formAction] = useActionState(action, {})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(t)
    }
  }, [copied])

  function copyKey() {
    if (state.generatedKey) {
      navigator.clipboard.writeText(state.generatedKey)
      setCopied(true)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="name" className="sr-only">Key name</Label>
          <Input
            id="name"
            name="name"
            placeholder='Key name (e.g. "Claude", "Cursor")'
            required
          />
        </div>
        <SubmitButton label="Generate" />
      </form>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      {state.generatedKey && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2">
            Copy this key now — it won&apos;t be shown again!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
              {state.generatedKey}
            </code>
            <Button variant="outline" size="icon" onClick={copyKey} className="shrink-0" aria-label="Copy API key">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
