"use client"

import { useMemo } from "react"
import DOMPurify from "dompurify"
import { cn } from "@/lib/utils"

type Props = {
  html: string
  className?: string
}

export function RichTextViewer({ html, className }: Props) {
  const clean = useMemo(
    () => (html && html !== "<p></p>" ? DOMPurify.sanitize(html) : ""),
    [html]
  )

  if (!clean) return null
  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
