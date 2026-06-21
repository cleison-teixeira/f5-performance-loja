import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UserMenu } from './UserMenu'

interface HeaderProps {
  nomeUsuario?: string
  nomeLoja?: string
}

export function Header({ nomeUsuario = '', nomeLoja = '' }: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b bg-background sticky top-0 z-40">
      <div className="md:hidden font-semibold text-base tracking-tight">Recway</div>
      <div className="hidden md:block text-sm text-muted-foreground">{nomeLoja}</div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <UserMenu nomeUsuario={nomeUsuario} />
      </div>
    </header>
  )
}
