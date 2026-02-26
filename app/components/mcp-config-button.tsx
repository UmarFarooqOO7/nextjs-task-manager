"use client"

import { useState } from "react"
import { Check, Copy, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function McpConfigButton() {
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"
  const config = JSON.stringify({
    mcpServers: {
      taskflow: {
        type: "http",
        url: `${origin}/api/mcp/mcp`,
      },
    },
  }, null, 2)

  function handleCopy() {
    navigator.clipboard.writeText(config)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label="MCP configuration">
          <Plug className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">MCP Configuration</h4>
            <Button variant="ghost" size="icon" className="size-7" onClick={handleCopy} aria-label="Copy config">
              {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Add this to your AI tool&apos;s MCP configuration:
          </p>
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto whitespace-pre">
            {config}
          </pre>
        </div>
      </PopoverContent>
    </Popover>
  )
}
