'use client'

import { useState, useMemo } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComissaoExtrato } from './page'
import type { TipoComissao } from '@/types/app'

interface RecomprasListaProps {
  recompras: ComissaoExtrato[]
  isVendedora: boolean
  vendedoras: { id: string; nome: string }[]
}

type Periodo = '7' | '30' | '90'

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  const [date] = iso.split('T')
  const [ano, mes, dia] = date.split('-')
  return `${dia}/${mes}/${ano}`
}

function diasAtras(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

const TIPO_LABELS: Record<TipoComissao, string> = {
  produto_fixo: 'Fixo por produto',
  campanha: 'Campanha',
  meta_batida: 'Meta batida',
  base: 'Base',
  padrao: 'Padrão',
}

const TIPO_CLASS: Record<TipoComissao, string> = {
  produto_fixo: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  campanha: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  meta_batida: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  base: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  padrao: 'bg-muted text-muted-foreground',
}

const ORIGEM_LABELS: Record<string, string> = {
  venda_manual: 'Venda',
  recompra: 'Recompra',
  oferta: 'Oferta',
}

function BadgeTipo({ tipo }: { tipo: TipoComissao | null }) {
  if (!tipo || tipo === 'padrao') return null
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TIPO_CLASS[tipo])}>
      {TIPO_LABELS[tipo]}
    </span>
  )
}

function BadgeOrigem({ origem }: { origem: string }) {
  const label = ORIGEM_LABELS[origem] ?? origem
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      origem === 'recompra'
        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
        : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400'
    )}>
      {label}
    </span>
  )
}

export function RecomprasLista({ recompras, isVendedora, vendedoras }: RecomprasListaProps) {
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [vendedoraId, setVendedoraId] = useState('')
  const [busca, setBusca] = useState('')
  const [drawerAberto, setDrawerAberto] = useState(false)

  const filtradas = useMemo(() => {
    const corte = diasAtras(Number(periodo))
    return recompras.filter(r => {
      if (new Date(r.criado_em) < corte) return false
      if (vendedoraId && r.vendedora_id !== vendedoraId) return false
      if (busca.trim()) {
        if (!r.cliente_nome.toLowerCase().includes(busca.toLowerCase())) return false
      }
      return true
    })
  }, [recompras, periodo, vendedoraId, busca])

  const totalComissao = filtradas.reduce((s, r) => s + r.valor_comissao, 0)
  const temFiltrosAtivos = !!(vendedoraId || busca.trim())

  return (
    <div className="space-y-4">
      {/* Desktop filters */}
      <div className="hidden md:flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(['7', '30', '90'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                periodo === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent text-foreground'
              )}
            >
              {p}d
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="rounded-md border border-input px-3 py-1.5 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-48"
        />

        {!isVendedora && vendedoras.length > 0 && (
          <select
            value={vendedoraId}
            onChange={e => setVendedoraId(e.target.value)}
            className="rounded-md border border-input px-3 py-1.5 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todas as vendedoras</option>
            {vendedoras.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        )}

        {temFiltrosAtivos && (
          <button
            onClick={() => { setVendedoraId(''); setBusca('') }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Mobile: period + filter button */}
      <div className="flex items-center justify-between gap-3 md:hidden">
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(['7', '30', '90'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                periodo === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent'
              )}
            >
              {p}d
            </button>
          ))}
        </div>
        <button
          onClick={() => setDrawerAberto(true)}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
            temFiltrosAtivos
              ? 'bg-primary/10 border-primary text-primary font-medium'
              : 'border-input hover:bg-accent'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros{temFiltrosAtivos ? ' •' : ''}
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {isVendedora ? 'Minha comissão no período' : 'Total de comissões'}
        </p>
        <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
          {formatarBRL(totalComissao)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {filtradas.length} comissão{filtradas.length !== 1 ? 'ões' : ''} no período
        </p>
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma comissão no período.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtradas.map(r => (
              <ComissaoCard key={r.id} comissao={r} isVendedora={isVendedora} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                  {!isVendedora && (
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vendedora</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produtos</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Origem / Tipo</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">%</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatarData(r.criado_em)}
                    </td>
                    <td className="px-4 py-3 font-medium">{r.cliente_nome}</td>
                    {!isVendedora && (
                      <td className="px-4 py-3 text-muted-foreground">{r.vendedora_nome}</td>
                    )}
                    <td className="px-4 py-3 max-w-[180px] text-muted-foreground">
                      <ProdutosCell produtos={r.produtos} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <BadgeOrigem origem={r.origem} />
                        <BadgeTipo tipo={r.tipo_comissao} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatarBRL(r.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                      {r.valor_base_comissao < r.valor_total
                        ? formatarBRL(r.valor_base_comissao)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {r.percentual > 0 ? `${r.percentual}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                      {formatarBRL(r.valor_comissao)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Mobile filter drawer */}
      {drawerAberto && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 md:hidden"
            onClick={() => setDrawerAberto(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-2xl border-t shadow-xl md:hidden max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold">Filtros</span>
              <button
                onClick={() => setDrawerAberto(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 pb-10 space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Buscar cliente
                </label>
                <input
                  type="text"
                  placeholder="Nome do cliente..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {!isVendedora && vendedoras.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Vendedora
                  </label>
                  <select
                    value={vendedoraId}
                    onChange={e => setVendedoraId(e.target.value)}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Todas</option>
                    {vendedoras.map(v => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {temFiltrosAtivos && (
                <button
                  onClick={() => { setVendedoraId(''); setBusca('') }}
                  className="w-full rounded-md border border-input px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ComissaoCard({ comissao: r, isVendedora }: { comissao: ComissaoExtrato; isVendedora: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{r.cliente_nome}</p>
          {!isVendedora && (
            <p className="text-xs text-muted-foreground">{r.vendedora_nome}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-green-600 dark:text-green-400">{formatarBRL(r.valor_comissao)}</p>
          <p className="text-xs text-muted-foreground">{formatarData(r.criado_em)}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        <ProdutosCell produtos={r.produtos} />
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <BadgeOrigem origem={r.origem} />
        <BadgeTipo tipo={r.tipo_comissao} />
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Total: <span className="text-foreground font-medium">{formatarBRL(r.valor_total)}</span></span>
          {r.valor_base_comissao < r.valor_total && (
            <span>Base: <span className="text-foreground">{formatarBRL(r.valor_base_comissao)}</span></span>
          )}
          {r.percentual > 0 && <span>{r.percentual}%</span>}
        </div>
      </div>
    </div>
  )
}

function ProdutosCell({ produtos }: { produtos: string[] }) {
  if (produtos.length === 0) return <span>—</span>
  if (produtos.length === 1) return <span>{produtos[0]}</span>
  return <span>{produtos[0]} <span className="text-muted-foreground">+{produtos.length - 1}</span></span>
}
