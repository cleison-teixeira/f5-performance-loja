import { StagingBanner } from '@/components/StagingBanner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100">
      <StagingBanner />
      {children}
    </div>
  )
}
