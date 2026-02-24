import { getTasks } from "@/lib/data"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const tasks = await getTasks()
  return NextResponse.json(tasks.map(t => ({ id: t.id, title: t.title })))
}
