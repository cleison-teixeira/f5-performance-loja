function Shimmer({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} />
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-1.5">
      <Shimmer className="h-6 w-44" />
      <Shimmer className="h-3.5 w-56 bg-muted/60" />
    </div>
  )
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid gap-3 ${count === 2 ? 'grid-cols-2' : count === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-2">
          <Shimmer className="h-3 w-20 bg-muted/70" />
          <Shimmer className="h-7 w-12" />
          <Shimmer className="h-2.5 w-24 bg-muted/50" />
        </div>
      ))}
    </div>
  )
}

export function ListItemsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 animate-pulse space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 py-3 ${i < count - 1 ? 'border-b border-border/50' : ''}`}>
          <Shimmer className="h-9 w-9 rounded-full flex-none" />
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3.5 w-32" />
            <Shimmer className="h-3 w-24 bg-muted/60" />
          </div>
          <Shimmer className="h-5 w-14 rounded-full bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shimmer className="h-9 w-9 rounded-lg flex-none" />
              <div className="space-y-1.5">
                <Shimmer className="h-3.5 w-36" />
                <Shimmer className="h-3 w-24 bg-muted/60" />
              </div>
            </div>
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
          <div className="h-1 w-full bg-muted/40 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function TableRowsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
      <div className="border-b border-border/50 px-4 py-3 flex gap-4">
        <Shimmer className="h-3 w-28 bg-muted/50" />
        <Shimmer className="h-3 w-20 bg-muted/40" />
        <Shimmer className="ml-auto h-3 w-16 bg-muted/40" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`px-4 py-3.5 flex items-center gap-3 ${i < count - 1 ? 'border-b border-border/30' : ''}`}>
          <div className="flex-1 space-y-1.5">
            <Shimmer className="h-3.5 w-36" />
            <Shimmer className="h-3 w-24 bg-muted/55" />
          </div>
          <Shimmer className="h-3.5 w-20 bg-muted/50" />
          <Shimmer className="h-6 w-14 rounded-full bg-muted/60" />
        </div>
      ))}
    </div>
  )
}

export function MobileCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <Shimmer className="h-3.5 w-40" />
              <Shimmer className="h-3 w-28 bg-muted/60" />
            </div>
            <Shimmer className="h-6 w-16 rounded-full flex-none" />
          </div>
          <div className="mt-3 pt-3 border-t border-border/40 flex gap-3">
            <Shimmer className="h-3 w-20 bg-muted/50" />
            <Shimmer className="h-3 w-16 bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 animate-pulse space-y-4">
      <div className="space-y-1.5">
        <Shimmer className="h-3 w-20 bg-muted/60" />
        <Shimmer className="h-9 w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map(i => (
          <div key={i} className="space-y-1.5">
            <Shimmer className="h-3 w-16 bg-muted/60" />
            <Shimmer className="h-9 w-full" />
          </div>
        ))}
      </div>
      <Shimmer className="h-9 w-full" />
    </div>
  )
}
