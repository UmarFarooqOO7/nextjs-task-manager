"use client"

import { useActionState, useRef, useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { SubmitButton } from "./submit-button"
import { Bot, User } from "lucide-react"
import type { ActionState, Comment } from "@/lib/types"

type Props = {
  comments: Comment[]
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>
}

export function Comments({ comments, action }: Props) {
  const [state, formAction] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const [prevCount, setPrevCount] = useState(comments.length)

  useEffect(() => {
    if (comments.length > prevCount && !state.error && formRef.current) {
      formRef.current.reset()
    }
    setPrevCount(comments.length)
  }, [comments.length, prevCount, state.error])

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">Comments ({comments.length})</h3>

      {comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {comments.map(c => (
            <li key={c.id} className="flex gap-2.5 text-sm">
              <div className="mt-0.5 shrink-0">
                {c.author_type === "agent"
                  ? <Bot className="size-4 text-blue-500" />
                  : <User className="size-4 text-muted-foreground" />}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.author}</span>
                  {c.author_type === "agent" && (
                    <span className="text-[10px] rounded bg-blue-500/10 text-blue-500 px-1.5 py-0.5">agent</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        {state.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        <Textarea name="body" placeholder="Add a comment..." rows={2} required aria-label="Comment" />
        <div>
          <SubmitButton label="Comment" />
        </div>
      </form>
    </div>
  )
}
