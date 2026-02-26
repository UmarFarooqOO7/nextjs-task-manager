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
      className="-ml-2 mb-4"
      onClick={() => router.back()}
    >
      <ChevronLeft className="size-4" />
      Back
    </Button>
  )
}
