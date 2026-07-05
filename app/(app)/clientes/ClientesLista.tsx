'use client'

import { useState, useMemo } from 'react'
import { Users, TrendingUp, UserMinus, Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export type ClienteItem = {
  id: string
  nome: string
  whatsapp: string
  criado_em: string
  qtd: number
  total: number
  ultima: string | null
  loja_nome: string | null
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('T')[0].split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatarWhatsApp(w: string): string {
  const digits = w.replace(/\D/g, '')
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return w
}

function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

interface Props {
  clientes: ClienteItem[]
  mostrarLoja: boolean
}

export function ClientesLista({ clientes, mostrarLoja }: Props) {
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return clientes
    const digits = busca.replace(/\D/g, '')
    return clientes.filter(c => {
      const matchNome = c.nome.toLowerCase().includes(q)
      const matchWhatsapp = digits.length >= 4 && c.whatsapp.includes(digits)
      return matchNome || matchWhatsapp
    })
  }, [clientes, busca])

  const total = clientes.length
  const comCompras = clientes.filter(c => c.qtd > 0).length
  const semCompras = total - comCompras

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cards de resumo ── */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600/65 dark:text-blue-400/60 flex items-center gap-1.5">
              <Users className="h-3 w-3 flex-none" />
              Total de clientes
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none text-blue-700 dark:text-blue-400">
              {total}
            </p>
            <p className="text-[11px] text-blue-600/55 dark:text-blue-400/50 leading-tight">
              {mostrarLoja ? 'na rede' : 'na base da loja'}
            </p>
          </div>

          <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/65 dark:text-emerald-400/60 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 flex-none" />
              Com compras
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${comCompras > 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-muted-foreground'}`}>
              {comCompras}
            </p>
            <p className="text-[11px] text-emerald-700/55 dark:text-emerald-400/50 leading-tight">
              já compraram
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
              <UserMinus className="h-3 w-3 flex-none" />
              Sem compras
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${semCompras > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {semCompras}
            </p>
            <p className="text-[11px] text-muted-foreground/55 leading-tight">
              sem histórico registrado
            </p>
          </div>
        </div>
      )}

      {/* ── Busca ── */}
      {total > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone…"
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {/* ── Lista ── */}
      {total === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente ainda"
          description="Os clientes aparecem aqui automaticamente quando uma compra é registrada."
        />
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum cliente encontrado para <strong>&ldquo;{busca}&rdquo;</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">Base de clientes</h2>
            <p className="text-xs text-muted-foreground">
              {busca.trim()
                ? `${filtrados.length} de ${total} cliente${total !== 1 ? 's' : ''}`
                : `Ordenados por nome · ${total} cliente${total !== 1 ? 's' : ''}`}
            </p>
          </div>

          <ul className="space-y-2">
            {filtrados.map(c => (
              <li key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0 mt-0.5">
                    {iniciais(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{formatarWhatsApp(c.whatsapp)}</p>
                      </div>
                      {c.qtd > 0 ? (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                            {formatarBRL(c.total)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.qtd} {c.qtd === 1 ? 'compra' : 'compras'}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground shrink-0">
                          Sem compras
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {c.qtd > 0 && c.ultima && (
                        <p className="text-xs text-muted-foreground">
                          Última compra {formatarData(c.ultima)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Cliente desde {formatarData(c.criado_em)}
                      </p>
                      {c.loja_nome && (
                        <p className="text-xs font-medium text-muted-foreground">
                          {c.loja_nome}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
