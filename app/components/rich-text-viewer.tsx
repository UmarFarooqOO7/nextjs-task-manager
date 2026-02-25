import { cn } from "@/lib/utils"

type Props = {
  html: string
  className?: string
}

export function RichTextViewer({ html, className }: Props) {
  if (!html || html === "<p></p>") return null
  return (
    <div
      className={cn("prose prose-sm dark:prose-invert max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
