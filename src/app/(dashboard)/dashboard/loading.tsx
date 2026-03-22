import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-32" />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card">
            <div className="px-6 py-4 border-b">
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between px-6 py-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
