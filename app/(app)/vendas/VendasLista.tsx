'use client'

import { useState, useMemo } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'
import type { VendaExtrato, VendaItemExtrato } from './page'

interface VendasListaProps {
  vendas: VendaExtrato[]
  isVendedora: boolean
  vendedoras: { id: string; nome: string }[]
}

type Periodo = '7' | '30' | '90'

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  const date = iso.includes('T') ? iso.split('T')[0] : iso
  const [ano, mes, dia] = date.split('-')
  return `${dia}/${mes}/${ano}`
}

function diasAtras(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

export function VendasLista({ vendas, isVendedora, vendedoras }: VendasListaProps) {
  const [periodo, setPeriodo] = useState<Periodo>('30')
  const [vendedoraId, setVendedoraId] = useState('')
  const [busca, setBusca] = useState('')
  const [soRecorrente, setSoRecorrente] = useState(false)
  const [produtoNome, setProdutoNome] = useState('')
  const [drawerAberto, setDrawerAberto] = useState(false)

  const produtosUnicos = useMemo(() => {
    const nomes = new Set<string>()
    vendas.forEach(v => v.itens.forEach(i => nomes.add(i.produto_nome)))
    return Array.from(nomes).sort()
  }, [vendas])

  const filtradas = useMemo(() => {
    const corte = diasAtras(Number(periodo))
    return vendas.filter(v => {
      if (new Date(v.data_compra + 'T00:00:00') < corte) return false
      if (vendedoraId && v.vendedora_id !== vendedoraId) return false
      if (busca.trim()) {
        if (!v.cliente_nome.toLowerCase().includes(busca.toLowerCase())) return false
      }
      if (soRecorrente && !v.tem_recorrente) return false
      if (produtoNome && !v.itens.some(i => i.produto_nome === produtoNome)) return false
      return true
    })
  }, [vendas, periodo, vendedoraId, busca, soRecorrente, produtoNome])

  const totalValor = filtradas.reduce((s, v) => s + v.valor_total, 0)
  const totalPrevisao = filtradas.reduce((s, v) => s + v.previsao_comissao, 0)
  const temFiltrosAtivos = !!(vendedoraId || busca.trim() || soRecorrente || produtoNome)

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

        {produtosUnicos.length > 0 && (
          <select
            value={produtoNome}
            onChange={e => setProdutoNome(e.target.value)}
            className="rounded-md border border-input px-3 py-1.5 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos os produtos</option>
            {produtosUnicos.map(nome => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setSoRecorrente(!soRecorrente)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm transition-colors',
            soRecorrente
              ? 'bg-primary/10 border-primary text-primary font-medium'
              : 'border-input hover:bg-accent'
          )}
        >
          Somente recorrentes
        </button>

        {temFiltrosAtivos && (
          <button
            onClick={() => { setVendedoraId(''); setBusca(''); setSoRecorrente(false); setProdutoNome('') }}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total vendido</p>
          <p className="text-xl font-bold mt-0.5">{formatarBRL(totalValor)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {filtradas.length} venda{filtradas.length !== 1 ? 's' : ''}
          </p>
        </div>
        {totalPrevisao > 0 && (
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Prev. comissão futura</p>
            <p className="text-xl font-bold mt-0.5 text-amber-600 dark:text-amber-400">
              {formatarBRL(totalPrevisao)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">se recomprarem</p>
          </div>
        )}
      </div>

      {filtradas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma venda encontrada.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtradas.map(v => (
              <VendaCard key={v.id} venda={v} isVendedora={isVendedora} />
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
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Prev. comissão</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatarData(v.data_compra)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{v.cliente_nome}</p>
                      {v.cliente_whatsapp && (
                        <p className="text-xs text-muted-foreground">{formatarWhatsapp(v.cliente_whatsapp)}</p>
                      )}
                    </td>
                    {!isVendedora && (
                      <td className="px-4 py-3 text-muted-foreground">{v.vendedora_nome}</td>
                    )}
                    <td className="px-4 py-3 max-w-[220px]">
                      <ProdutosCell itens={v.itens} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      {formatarBRL(v.valor_total)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {v.previsao_comissao > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {formatarBRL(v.previsao_comissao)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {v.qtd_avisos > 0 ? v.qtd_avisos : '—'}
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

              {produtosUnicos.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                    Produto
                  </label>
                  <select
                    value={produtoNome}
                    onChange={e => setProdutoNome(e.target.value)}
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Todos os produtos</option>
                    {produtosUnicos.map(nome => (
                      <option key={nome} value={nome}>{nome}</option>
                    ))}
                  </select>
                </div>
              )}

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

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Somente com recorrência</label>
                <button
                  type="button"
                  onClick={() => setSoRecorrente(!soRecorrente)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    soRecorrente ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                      soRecorrente ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {temFiltrosAtivos && (
                <button
                  onClick={() => { setVendedoraId(''); setBusca(''); setSoRecorrente(false); setProdutoNome('') }}
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

function VendaCard({ venda: v, isVendedora }: { venda: VendaExtrato; isVendedora: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const mostrarExpandir = v.itens.length > 1

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{v.cliente_nome}</p>
          {v.cliente_whatsapp && (
            <p className="text-xs text-muted-foreground">{formatarWhatsapp(v.cliente_whatsapp)}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold">{formatarBRL(v.valor_total)}</p>
          <p className="text-xs text-muted-foreground">{formatarData(v.data_compra)}</p>
        </div>
      </div>

      {!expandido && (
        <p className="text-sm text-muted-foreground">
          {v.itens[0]?.produto_nome ?? '—'}
          {v.itens.length > 1 && ` e mais ${v.itens.length - 1}`}
        </p>
      )}

      {expandido && (
        <div className="space-y-1 border-t pt-2">
          {v.itens.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {item.produto_nome}
                {item.quantidade > 1 && ` ×${item.quantidade}`}
                {item.recorrente && <span className="ml-1 text-primary">↺</span>}
              </span>
              <span className="font-medium">{formatarBRL(item.subtotal)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {!isVendedora && (
          <span className="text-muted-foreground">
            {v.vendedora_nome}
          </span>
        )}
        {v.tem_recorrente && (
          <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
            Recorrente
          </span>
        )}
        {v.qtd_avisos > 0 && (
          <span className="text-muted-foreground">
            {v.qtd_avisos} aviso{v.qtd_avisos !== 1 ? 's' : ''}
          </span>
        )}
        {v.previsao_comissao > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            Prev. {formatarBRL(v.previsao_comissao)}
          </span>
        )}
      </div>

      {mostrarExpandir && (
        <button
          onClick={() => setExpandido(!expandido)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expandido ? 'Ver menos' : `Ver ${v.itens.length} produtos`}
        </button>
      )}
    </div>
  )
}

function ProdutosCell({ itens }: { itens: VendaItemExtrato[] }) {
  if (itens.length === 0) return <span className="text-muted-foreground">—</span>
  const primeiro = itens[0]
  return (
    <span>
      {primeiro.produto_nome}
      {primeiro.quantidade > 1 && ` ×${primeiro.quantidade}`}
      {primeiro.recorrente && <span className="ml-1 text-xs text-primary">↺</span>}
      {itens.length > 1 && (
        <span className="text-muted-foreground"> +{itens.length - 1}</span>
      )}
    </span>
  )
}
