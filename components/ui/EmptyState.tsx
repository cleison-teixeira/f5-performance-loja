import { type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center space-y-3',
      className
    )}>
      <div className="rounded-full bg-muted/60 p-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">{description}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="mt-1 inline-flex items-center rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
