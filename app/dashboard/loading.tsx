import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>

      <div className="mt-8">
        <Skeleton className="h-10 w-48 mb-4" />
        <div className="space-y-4">
          {Array(5)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
        </div>
      </div>
    </div>
  )
}
