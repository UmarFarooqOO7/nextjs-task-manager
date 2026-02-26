import { redirect } from "next/navigation"

type Props = { params: Promise<{ id: string }> }

export default async function TasksRedirectPage({ params }: Props) {
  const { id } = await params
  redirect(`/projects/${id}/board`)
}
