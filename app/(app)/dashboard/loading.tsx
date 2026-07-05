import { HeroSkeleton, CardsSkeleton, ListaSkeleton } from './DashboardSkeletons'

export default function Loading() {
  return (
    <div className="space-y-4">
      <HeroSkeleton />
      <CardsSkeleton />
      <ListaSkeleton />
      <ListaSkeleton />
    </div>
  )
}
