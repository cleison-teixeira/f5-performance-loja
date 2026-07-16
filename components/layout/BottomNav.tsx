'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Bell, ShoppingCart, Package, MoreHorizontal, X,
  Building2, UsersRound,
  ClipboardList, Clock, GraduationCap, Users, MessageCircle, TrendingDown, BookOpen, Star, Network, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DrawerItem = { href: string; label: string; icon: React.ElementType; newBadge?: string }

const mainItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/avisos', label: 'Fila', icon: Bell },
  { href: '/vendas/nova', label: 'Registrar Venda', icon: ShoppingCart },
  { href: '/produtos', label: 'Produtos', icon: Package },
]

const operacaoDrawer: DrawerItem[] = [
  { href: '/relacionamento', label: 'Relacionamento', icon: MessageCircle },
  { href: '/perdas', label: 'Recompras perdidas', icon: TrendingDown },
  { href: '/vendas', label: 'Extrato de vendas', icon: ClipboardList },
  { href: '/clientes', label: 'Carteira de Clientes', icon: Users },
  { href: '/lista-espera', label: 'Pedidos em Espera', icon: Clock },
  { href: '/demandas-rede', label: 'Demandas da Rede', icon: Network, newBadge: 'Novo' },
]

const gestaoDrawerBase: DrawerItem[] = [
  { href: '/minha-conta', label: 'Minha Conta', icon: Building2 },
  { href: '/configuracoes/equipe', label: 'Equipe', icon: UsersRound },
]

const gestaoDrawerVendedora: DrawerItem[] = []

const configuracaoDrawerBase: DrawerItem[] = [
  { href: '/configuracoes/produtos', label: 'Produtos e Mensagens', icon: Package },
  { href: '/configuracoes/bibliotecas', label: 'Bibliotecas', icon: BookOpen },
]

const configuracaoDrawerVendedora: DrawerItem[] = [
  { href: '/configuracoes/produtos', label: 'Produtos e Mensagens', icon: Package },
]

const aprenderDrawer: DrawerItem[] = [
  { href: '/treinamentos', label: 'F5 Academy', icon: GraduationCap },
]

const parceirosDrawer: DrawerItem[] = [
  { href: '/parceiros', label: 'F5 Partners', icon: Star },
]

interface Props {
  role: string
  badgesMap?: Record<string, number>
}

export function BottomNav({ role, badgesMap = {} }: Props) {
  const pathname = usePathname()
  const [drawerAberto, setDrawerAberto] = useState(false)
  const hideGestao = role === 'vendedora'

  const gestaoDrawer = hideGestao ? gestaoDrawerVendedora : gestaoDrawerBase
  const configuracaoDrawer = hideGestao ? configuracaoDrawerVendedora : configuracaoDrawerBase

  const drawerSections = [
    { label: 'Operação', items: operacaoDrawer },
    { label: 'Gestão', items: gestaoDrawer },
    { label: 'Configuração', items: configuracaoDrawer },
    { label: 'Aprender', items: aprenderDrawer },
    { label: 'Parceiros', items: parceirosDrawer },
  ]

  const allDrawerItems = drawerSections.flatMap(s => s.items)

  const maisAtivo = allDrawerItems.some(
    i => pathname === i.href || pathname.startsWith(i.href + '/')
  )

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {mainItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            const badge = badgesMap[href]
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors touch-manipulation active:opacity-70',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center px-0.5 leading-none pointer-events-none">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setDrawerAberto(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors touch-manipulation active:opacity-70',
              maisAtivo ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span>Mais</span>
          </button>
        </div>
      </nav>

      {/* Drawer "Mais" */}
      {drawerAberto && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
            onClick={() => setDrawerAberto(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-2xl border-t shadow-xl md:hidden max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Menu</span>
              <button
                onClick={() => setDrawerAberto(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-2 pb-10 space-y-1">
              {drawerSections.map((section, si) => (
                <div key={section.label}>
                  {si > 0 && <div className="my-1 border-t" />}
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </p>
                  {section.items.map(({ href, label, icon: Icon, newBadge }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setDrawerAberto(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors touch-manipulation active:bg-muted/60',
                          active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1">{label}</span>
                        {newBadge && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded px-1 py-0.5 leading-none">
                            <Sparkles className="h-2.5 w-2.5" />
                            {newBadge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
