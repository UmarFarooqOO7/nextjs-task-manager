"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BackButton({ fallback = "/projects" }: { fallback?: string }) {
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      size="sm"
      className="sm:hidden -ml-2 mb-4"
      onClick={() => router.push(fallback)}
    >
      <ChevronLeft className="size-4" />
      Back
    </Button>
  )
}
