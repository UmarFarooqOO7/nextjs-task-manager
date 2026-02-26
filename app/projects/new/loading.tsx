import { Skeleton } from "@/components/ui/skeleton"

export default function NewProjectLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Skeleton className="h-8 w-20 mb-4" />
      <div className="rounded-lg border p-6 space-y-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  )
}
