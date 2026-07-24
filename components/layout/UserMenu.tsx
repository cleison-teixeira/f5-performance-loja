'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserAvatar } from '@/components/ui/UserAvatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'

interface UserMenuProps {
  nomeUsuario?: string
  nomeLoja?: string
  role?: string
  lojaLogoUrl?: string | null
  avatarUrl?: string | null
  isAcessoRede?: boolean
}

export function UserMenu({ nomeUsuario = '', nomeLoja = '', role = '', lojaLogoUrl, avatarUrl, isAcessoRede }: UserMenuProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="cursor-pointer">
          {isAcessoRede
            ? <UserAvatar nome={nomeUsuario} avatarUrl={avatarUrl} tamanho="sm" />
            : <UserAvatar nome={nomeLoja || nomeUsuario} avatarUrl={lojaLogoUrl} tamanho="sm" />
          }
        </div>
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
