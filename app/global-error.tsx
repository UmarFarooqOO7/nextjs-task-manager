"use client"

import { Button } from "@/components/ui/button"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center px-4">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">
            An unexpected error occurred.
          </p>
          <Button onClick={reset} variant="outline" size="sm">
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
}
