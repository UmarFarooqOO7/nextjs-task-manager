"use client"

import { useActionState } from "react"
import { createProjectAction } from "@/lib/actions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@radix-ui/react-label"
import { BackButton } from "@/app/components/back-button"
import { SubmitButton } from "@/app/components/submit-button"
import Link from "next/link"

export default function NewProjectPage() {
  const [state, formAction] = useActionState(createProjectAction, {})

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <BackButton fallback="/projects" />
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">New Project</CardTitle>
          <p className="text-sm text-muted-foreground">Create a project to organize your tasks.</p>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-5">
            {state.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Project name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Optional description"
              />
            </div>

            <div className="flex gap-3">
              <SubmitButton label="Create Project" />
              <Button variant="outline" asChild>
                <Link href="/projects">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
