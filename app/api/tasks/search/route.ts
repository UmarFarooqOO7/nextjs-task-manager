import { getTasks } from "@/lib/data"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const projectId = Number(url.searchParams.get("projectId"))
  if (!projectId) return NextResponse.json([])

  const tasks = await getTasks(projectId)
  return NextResponse.json(tasks.map(t => ({ id: t.id, title: t.title })))
}
