"use client"

import { useEffect, useState } from "react"

function nameToHsl(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 65% 48%)`
}

function initials(name: string): string {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
}

export function PresenceAvatars() {
  const [roster, setRoster] = useState<string[]>([])

  useEffect(() => {
    function handler(e: Event) {
      setRoster((e as CustomEvent<{ roster: string[] }>).detail.roster)
    }
    window.addEventListener("sse:presence", handler)
    return () => window.removeEventListener("sse:presence", handler)
  }, [])

  if (roster.length === 0) return null

  const visible = roster.slice(0, 5)
  const overflow = roster.length - visible.length

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((actor, i) => (
        <div
          key={`${actor}-${i}`}
          title={actor}
          role="img"
          aria-label={actor}
          className="size-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white select-none"
          style={{ backgroundColor: nameToHsl(actor) }}
        >
          {initials(actor)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="size-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </div>
      )}
    </div>
  )
}
