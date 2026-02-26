import { Skeleton } from "@/components/ui/skeleton"

export default function BoardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: col === 0 ? 3 : 2 }).map((_, i) => (
              <div key={i} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="size-4" />
                </div>
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
