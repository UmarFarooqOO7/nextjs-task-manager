"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  const { resolvedTheme, setTheme } = useTheme()

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
    if (!open) return
    fetch("/api/tasks/search")
      .then(r => r.json())
      .then(setTasks)
      .catch(() => {})
  }, [open])

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
          <CommandItem onSelect={() => run(() => router.push("/tasks"))}>
            <Home className="size-4 mr-2" />
            Home
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/tasks/new"))}>
            <Plus className="size-4 mr-2" />
            New Task
          </CommandItem>
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
        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks.map(t => (
                <CommandItem key={t.id} onSelect={() => run(() => router.push(`/tasks/${t.id}`))}>
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
