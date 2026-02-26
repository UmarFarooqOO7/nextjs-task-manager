"use client"

import { Button } from "@/components/ui/button"

export default function TaskError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h2 className="text-lg font-semibold mb-2">Failed to load task</h2>
      <p className="text-sm text-muted-foreground mb-4">
An unexpected error occurred.
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  )
}
