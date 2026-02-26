"use client"

import { Button } from "@/components/ui/button"

export default function BoardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">Failed to load the board.</p>
        <Button onClick={reset} variant="outline">
          Try again
        </Button>
      </div>
    </div>
  )
}
