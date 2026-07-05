import { PageHeaderSkeleton, TableRowsSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-5 min-h-[60vh]">
      <PageHeaderSkeleton />
      <TableRowsSkeleton count={7} />
    </div>
  )
}
