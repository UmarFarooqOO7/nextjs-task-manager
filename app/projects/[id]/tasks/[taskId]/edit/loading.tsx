import { Skeleton } from "@/components/ui/skeleton"

export default function EditTaskLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="h-8 w-20 mb-4" />
      <div className="rounded-lg border p-6 space-y-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  )
}
