import { PageHeaderSkeleton, MobileCardSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-5 min-h-[60vh]">
      <PageHeaderSkeleton />
      <MobileCardSkeleton count={5} />
    </div>
  )
}
