'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bell, ShoppingCart, Package,
  Building2, UsersRound,
  Settings, ClipboardList, Clock, GraduationCap, Users, MessageCircle, TrendingDown, BookOpen, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const operacaoItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/avisos', label: 'Fila de Recompra', icon: Bell },
  { href: '/relacionamento', label: 'Relacionamento', icon: MessageCircle },
  { href: '/perdas', label: 'Recompras perdidas', icon: TrendingDown },
  { href: '/vendas/nova', label: 'Registrar Venda', icon: ShoppingCart },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/clientes', label: 'Carteira de Clientes', icon: Users },
  { href: '/lista-espera', label: 'Pedidos em Espera', icon: Clock },
  { href: '/vendas', label: 'Extrato de vendas', icon: ClipboardList },
]

const gestaoItemsBase = [
  { href: '/minha-conta', label: 'Minha Conta', icon: Building2 },
  { href: '/configuracoes/equipe', label: 'Equipe', icon: UsersRound },
]

const gestaoItemsVendedora: typeof gestaoItemsBase = []

const configuracaoItemsBase = [
  { href: '/configuracoes/produtos', label: 'Produtos e Mensagens', icon: Package },
  { href: '/configuracoes/bibliotecas', label: 'Bibliotecas', icon: BookOpen },
]

const configuracaoItemsVendedora = [
  { href: '/configuracoes/produtos', label: 'Produtos e Mensagens', icon: Package },
]

const aprenderItems = [
  { href: '/treinamentos', label: 'F5 Academy', icon: GraduationCap },
]

const parceirosItems = [
  { href: '/parceiros', label: 'F5 Partners', icon: Star },
]

type NavItem = { href: string; label: string; icon: React.ElementType }

interface Props {
  role: string
  badgesMap?: Record<string, number>
}

export function Sidebar({ role, badgesMap = {} }: Props) {
  const pathname = usePathname()
  const hideGestao = role === 'vendedora'

  function isActive(href: string) {
    if (pathname === href) return true
    if (href === '/vendas') return false
    return pathname.startsWith(href + '/')
  }

  const linkClass = (active: boolean) =>
    cn(
      'relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors overflow-hidden',
      active
        ? 'bg-sidebar-primary/[0.15] text-[oklch(0.82_0.20_145)] font-semibold'
        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    )

  function Section({ label, Icon, items }: { label: string; Icon: React.ElementType; items: NavItem[] }) {
    if (items.length === 0) return null
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 mt-4">
          <Icon className="h-3 w-3 text-white/25" />
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.12em]">{label}</span>
        </div>
        <ul className="space-y-0.5">
          {items.map(({ href, label: itemLabel, icon: ItemIcon }) => {
            const active = isActive(href)
            const badge = badgesMap[href]
            return (
              <li key={href}>
                <Link href={href} className={linkClass(active)}>
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[oklch(0.62_0.20_145)]" />
                  )}
                  <ItemIcon className={cn('h-4 w-4 shrink-0', active && 'text-[oklch(0.72_0.20_145)]')} />
                  <span className="flex-1 truncate">{itemLabel}</span>
                  {badge != null && badge > 0 && (
                    <span className="ml-1 shrink-0 text-[9px] font-bold bg-red-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  const gestaoItems = hideGestao ? gestaoItemsVendedora : gestaoItemsBase
  const configuracaoItems = hideGestao ? configuracaoItemsVendedora : configuracaoItemsBase

  return (
    <aside className="hidden md:flex flex-col w-60 bg-sidebar h-screen sticky top-0 border-r border-sidebar-border">
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <img src="/branding/logo-f5-recompra.png" alt="F5 Recompra" className="h-7 w-auto object-contain" />
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <Section label="Operação" Icon={ShoppingCart} items={operacaoItems} />
        <Section label="Gestão" Icon={Building2} items={gestaoItems} />
        <Section label="Configuração" Icon={Settings} items={configuracaoItems} />
        <Section label="Aprender" Icon={GraduationCap} items={aprenderItems} />
        <Section label="Parceiros" Icon={Star} items={parceirosItems} />
      </nav>
    </aside>
  )
}
