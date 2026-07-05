import { PageHeaderSkeleton, ListItemsSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-5 min-h-[60vh]">
      <PageHeaderSkeleton />
      <ListItemsSkeleton count={5} />
    </div>
  )
}
