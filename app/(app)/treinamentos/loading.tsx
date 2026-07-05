import { PageHeaderSkeleton, CardListSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-5 min-h-[60vh]">
      <PageHeaderSkeleton />
      <CardListSkeleton count={6} />
    </div>
  )
}
