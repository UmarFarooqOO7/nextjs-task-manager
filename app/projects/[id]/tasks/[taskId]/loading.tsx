import { Skeleton } from "@/components/ui/skeleton"

export default function TaskDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-8 w-20 mb-4" />
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="rounded-lg border p-6 space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-2 mt-6">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
            <Skeleton className="h-px w-full my-6" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
        <div className="w-full lg:w-56 shrink-0">
          <div className="rounded-lg border p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-2.5 w-12" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
