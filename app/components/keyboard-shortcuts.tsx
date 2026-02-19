"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Keyboard } from "lucide-react"

const SHORTCUTS = [
  { keys: ["n"], description: "New task" },
  { keys: ["/"], description: "Focus search" },
  { keys: ["Ctrl", "K"], description: "Command palette" },
  { keys: ["?"], description: "Show shortcuts" },
]

export function KeyboardShortcuts() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable

      if (isEditable) return

      switch (e.key) {
        case "n":
          e.preventDefault()
          router.push("/tasks/new")
          break
        case "/":
          e.preventDefault()
          document.getElementById("search-input")?.focus()
          break
        case "?":
          e.preventDefault()
          setOpen(o => !o)
          break
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [router])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Keyboard shortcuts"
        onClick={() => setOpen(true)}
      >
        <Keyboard className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <tbody>
              {SHORTCUTS.map(({ keys, description }) => (
                <tr key={description} className="border-b last:border-0">
                  <td className="py-2 pr-6">
                    <div className="flex gap-1">
                      {keys.map(k => (
                        <kbd
                          key={k}
                          className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </>
  )
}
