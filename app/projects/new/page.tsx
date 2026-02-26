import { createProjectAction } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BackButton } from "@/app/components/back-button"
import { NewProjectForm } from "./new-project-form"

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <BackButton fallback="/projects" />
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">New Project</CardTitle>
          <p className="text-sm text-muted-foreground">Create a project to organize your tasks.</p>
        </CardHeader>
        <CardContent>
          <NewProjectForm action={createProjectAction} />
        </CardContent>
      </Card>
    </div>
  )
}
