import { auth } from "@/lib/auth"
import { getProject, getTasks } from "@/lib/data"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const url = new URL(request.url)
  const projectId = Number(url.searchParams.get("projectId"))
  if (!projectId) return NextResponse.json([])

  // Verify ownership
  const project = await getProject(projectId)
  if (!project || project.owner_id !== session.user.id) {
    return NextResponse.json([], { status: 403 })
  }

  const tasks = await getTasks(projectId)
  return NextResponse.json(tasks.map(t => ({ id: t.id, title: t.title })))
}
