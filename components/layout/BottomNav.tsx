'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Bell, ShoppingCart, Package, MoreHorizontal, X,
  Building2, UsersRound,
  ClipboardList, Clock, GraduationCap, Users, MessageCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const mainItems = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/avisos', label: 'Fila', icon: Bell },
  { href: '/vendas/nova', label: 'Registrar', icon: ShoppingCart },
  { href: '/produtos', label: 'Produtos', icon: Package },
]

const operacaoDrawer = [
  { href: '/relacionamento', label: 'Relacionamento', icon: MessageCircle },
  { href: '/vendas', label: 'Extrato de vendas', icon: ClipboardList },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/lista-espera', label: 'Lista de Espera', icon: Clock },
]

const gestaoDrawerBase = [
  { href: '/configuracoes/loja', label: 'Loja', icon: Building2 },
  { href: '/configuracoes/equipe', label: 'Equipe', icon: UsersRound },
]

const gestaoDrawerVendedora: typeof gestaoDrawerBase = []

const configuracaoDrawer = [
  { href: '/configuracoes/produtos', label: 'Produtos e mensagens', icon: Package },
]

const aprenderDrawer = [
  { href: '/treinamentos', label: 'Academia F5', icon: GraduationCap },
]

interface Props {
  role: string
}

export function BottomNav({ role }: Props) {
  const pathname = usePathname()
  const [drawerAberto, setDrawerAberto] = useState(false)
  const isVendedora = role === 'vendedora'

  const gestaoDrawer = isVendedora ? gestaoDrawerVendedora : gestaoDrawerBase

  const drawerSections = [
    { label: 'Operação', items: operacaoDrawer },
    { label: 'Gestão', items: gestaoDrawer },
    ...(!isVendedora ? [{ label: 'Configuração', items: configuracaoDrawer }] : []),
    { label: 'Aprender', items: aprenderDrawer },
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
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors touch-manipulation',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => setDrawerAberto(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors touch-manipulation',
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
                  {section.items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/')
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setDrawerAberto(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors touch-manipulation',
                          active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {label}
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
