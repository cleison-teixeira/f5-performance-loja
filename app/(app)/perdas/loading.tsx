import { PageHeaderSkeleton, StatCardsSkeleton, MobileCardSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-5 min-h-[60vh]">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <MobileCardSkeleton count={4} />
    </div>
  )
}
