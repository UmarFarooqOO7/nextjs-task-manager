"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition, useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function SearchInput() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(searchParams.get("q") ?? "")

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setValue(next)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (next) params.set("q", next)
      else params.delete("q")
      params.delete("page")
      router.push(`${pathname}?${params}`)
    })
  }

  return (
    <div className="relative flex-1">
      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
      <Input
        id="search-input"
        className="pl-8"
        placeholder="Search tasks..."
        value={value}
        onChange={handleChange}
        data-pending={isPending ? "" : undefined}
        aria-label="Search tasks"
      />
    </div>
  )
}
