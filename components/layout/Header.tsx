import { UserMenu } from './UserMenu'
import { NotificacoesSino } from '@/components/notifications/NotificacoesSino'
import type { Notificacao } from '@/lib/notifications/types'

interface HeaderProps {
  nomeUsuario?: string
  nomeLoja?: string
  role?: string
  notificacoes?: Notificacao[]
  userId?: string
  lojaLogoUrl?: string | null
}

export function Header({ nomeUsuario = '', nomeLoja = '', role = '', notificacoes = [], userId, lojaLogoUrl }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-40">
      <div className="md:hidden font-semibold text-base tracking-tight">F5 Recompra</div>
      <div className="hidden md:block text-sm text-muted-foreground">{nomeLoja}</div>
      <div className="flex items-center gap-2">
        <NotificacoesSino notificacoes={notificacoes} userId={userId} />
        <UserMenu nomeUsuario={nomeUsuario} role={role} lojaLogoUrl={lojaLogoUrl} />
      </div>
    </header>
  )
}
