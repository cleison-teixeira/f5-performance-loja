export function HeroSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 animate-pulse space-y-4">
      <div className="h-3 w-24 bg-muted rounded" />
      <div className="h-9 w-40 bg-muted rounded" />
      <div className="h-3 w-48 bg-muted/60 rounded" />
      <div className="grid grid-cols-3 gap-3 pt-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-16 bg-muted rounded" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 animate-pulse space-y-2">
          <div className="h-7 w-7 rounded-lg bg-muted" />
          <div className="h-6 w-14 bg-muted rounded" />
          <div className="h-2.5 w-20 bg-muted/60 rounded" />
        </div>
      ))}
    </div>
  )
}

export function ListaSkeleton() {
  return (
    <div className="rounded-2xl border bg-card shadow-sm p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-muted flex-none" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 bg-muted rounded" />
            <div className="h-2.5 w-28 bg-muted/60 rounded" />
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-6 h-6 rounded-full bg-muted flex-none" />
          <div className="w-8 h-8 rounded-full bg-muted flex-none" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between gap-2">
              <div className="h-3.5 w-28 bg-muted rounded" />
              <div className="h-3.5 w-16 bg-muted rounded" />
            </div>
            <div className="h-1.5 w-full bg-muted/50 rounded-full" />
            <div className="h-2.5 w-24 bg-muted/40 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
