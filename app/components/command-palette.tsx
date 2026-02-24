"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Plus, Home, Sun, Moon, ClipboardList } from "lucide-react"

type TaskItem = { id: number; title: string }

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  const projectId = useMemo(() => {
    const match = pathname.match(/^\/projects\/(\d+)/)
    return match ? Number(match[1]) : undefined
  }, [pathname])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!open || !projectId) return
    fetch(`/api/tasks/search?projectId=${projectId}`)
      .then(r => r.json())
      .then(setTasks)
      .catch(() => {})
  }, [open, projectId])

  function run(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search tasks..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => run(() => router.push("/projects"))}>
            <Home className="size-4 mr-2" />
            Projects
          </CommandItem>
          {projectId && (
            <CommandItem onSelect={() => run(() => router.push(`/projects/${projectId}/tasks/new`))}>
              <Plus className="size-4 mr-2" />
              New Task
            </CommandItem>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
            {resolvedTheme === "dark"
              ? <Sun className="size-4 mr-2" />
              : <Moon className="size-4 mr-2" />}
            Toggle Theme
          </CommandItem>
        </CommandGroup>
        {tasks.length > 0 && projectId && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks.map(t => (
                <CommandItem key={t.id} onSelect={() => run(() => router.push(`/projects/${projectId}/tasks/${t.id}`))}>
                  <ClipboardList className="size-4 mr-2" />
                  {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
