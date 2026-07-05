import { PageHeaderSkeleton, StatCardsSkeleton, ListItemsSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-5 min-h-[60vh]">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <ListItemsSkeleton count={6} />
    </div>
  )
}
