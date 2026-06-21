'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bell, ShoppingCart, Package,
  DollarSign, Building2, UsersRound, SlidersHorizontal,
  Target, Settings, ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'

const operacaoItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/avisos', label: 'Avisos de hoje', icon: Bell },
  { href: '/vendas/nova', label: 'Nova venda', icon: ShoppingCart },
  { href: '/vendas', label: 'Extrato de vendas', icon: ClipboardList },
  { href: '/produtos', label: 'Produtos', icon: Package },
  { href: '/comissoes', label: 'Comissões', icon: DollarSign },
]

const gestaoItems = [
  { href: '/configuracoes/loja', label: 'Loja', icon: Building2 },
  { href: '/configuracoes/equipe', label: 'Equipe', icon: UsersRound },
  { href: '/metas', label: 'Metas', icon: Target },
]

const configuracaoItems = [
  { href: '/configuracoes/produtos', label: 'Produtos e mensagens', icon: Package },
  { href: '/configuracoes/comissoes', label: 'Comissões da equipe', icon: SlidersHorizontal },
]

type NavItem = { href: string; label: string; icon: React.ElementType }

export function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (pathname === href) return true
    // /vendas is a prefix of /vendas/nova — don't mark it active on sub-routes
    if (href === '/vendas') return false
    return pathname.startsWith(href + '/')
  }

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
      active
        ? 'bg-primary/10 text-primary font-medium'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    )

  function Section({ label, Icon, items }: { label: string; Icon: React.ElementType; items: NavItem[] }) {
    return (
      <>
        <div className="flex items-center gap-2 px-3 py-1.5 mt-3">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        <ul className="space-y-0.5">
          {items.map(({ href, label: itemLabel, icon: ItemIcon }) => (
            <li key={href}>
              <Link href={href} className={linkClass(isActive(href))}>
                <ItemIcon className="h-4 w-4 shrink-0" />
                {itemLabel}
              </Link>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <aside className="hidden md:flex flex-col w-60 border-r bg-background h-screen sticky top-0">
      <div className="flex items-center h-14 px-4 border-b">
        <span className="font-semibold text-lg tracking-tight">F5 Recompra</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        <Section label="Operação" Icon={ShoppingCart} items={operacaoItems} />
        <Section label="Gestão" Icon={Building2} items={gestaoItems} />
        <Section label="Configuração" Icon={Settings} items={configuracaoItems} />
      </nav>
    </aside>
  )
}
