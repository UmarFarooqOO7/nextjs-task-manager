"use client"

import { useEffect, useState } from "react"

export function PresencePill() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    function handler(e: Event) {
      setCount((e as CustomEvent<{ count: number }>).detail.count)
    }
    window.addEventListener("sse:presence", handler)
    return () => window.removeEventListener("sse:presence", handler)
  }, [])

  if (count === 0) return null

  return (
    <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      {count} live
    </span>
  )
}
