'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { limparOperador } from '@/lib/operador/actions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, RefreshCw } from 'lucide-react'

interface UserMenuProps {
  nomeUsuario?: string
  role?: string
  temOperadorPin?: boolean
}

export function UserMenu({ nomeUsuario = '', role = '', temOperadorPin = false }: UserMenuProps) {
  const router = useRouter()

  const iniciais = nomeUsuario
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleTrocarOperador() {
    await limparOperador()
    router.push('/selecionar-operador')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="text-xs">{iniciais || '?'}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{nomeUsuario || 'Usuário'}</p>
        </div>

        {role !== 'vendedora' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/minha-conta')} className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              Minha Conta
            </DropdownMenuItem>
          </>
        )}

        {temOperadorPin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleTrocarOperador} className="gap-2 cursor-pointer">
              <RefreshCw className="h-4 w-4" />
              Trocar operador
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
