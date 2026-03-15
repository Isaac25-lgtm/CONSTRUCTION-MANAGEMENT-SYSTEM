interface LoadingStateProps {
  rows?: number
}

/** Skeleton loading state matching the dark theme. */
export function LoadingState({ rows = 4 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-[10px] border border-bp-border bg-bp-bg2 p-4">
          <div className="mb-2 h-3 w-1/3 animate-pulse rounded bg-bp-surface" />
          <div className="h-2.5 w-2/3 animate-pulse rounded bg-bp-surface" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton grid for metric cards. */
export function MetricSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[10px] border border-bp-border bg-bp-bg2 p-3 text-center">
          <div className="mx-auto mb-2 h-5 w-5 animate-pulse rounded bg-bp-surface" />
          <div className="mx-auto mb-1 h-5 w-12 animate-pulse rounded bg-bp-surface" />
          <div className="mx-auto h-2.5 w-16 animate-pulse rounded bg-bp-surface" />
        </div>
      ))}
    </div>
  )
}
