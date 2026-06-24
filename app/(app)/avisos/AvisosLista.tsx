'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { AlertCircle, Bell, Calendar, TrendingUp } from 'lucide-react'
import { CardAviso } from './CardAviso'
import type { AvisoDetalhado } from './types'
import type { CatalogoProduto } from './page'

interface AvisosListaProps {
  avisos: AvisoDetalhado[]
  hoje: string
  catalogo: CatalogoProduto[]
  percentuaisPorVendedora: Record<string, number>
  loja_id: string
  isVendedora: boolean
}

type Periodo = 'todos' | 'atrasados' | 'hoje' | 'proximos7'
type TipoFiltro = 'todos' | AvisoDetalhado['tipo']

const TIPOS: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'agradecimento', label: 'Agradecimento' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'recompra', label: 'Recompra' },
  { value: 'oferta', label: 'Oferta' },
]

// Normaliza data para comparação sem risco de fuso horário
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ── Cabeçalho de seção ──────────────────────────────────────────────────────

interface SecaoProps {
  titulo: string
  subtitulo: string
  avisos: AvisoDetalhado[]
  corCls: string
  badgeCls: string
  icone: ReactNode
  valorPotencial: number
  onMarcado: (id: string) => void
  catalogo: CatalogoProduto[]
  percentuaisPorVendedora: Record<string, number>
  loja_id: string
  isVendedora: boolean
}

function SecaoAvisos({
  titulo, subtitulo, avisos, corCls, badgeCls, icone, valorPotencial,
  onMarcado, catalogo, percentuaisPorVendedora, loja_id, isVendedora,
}: SecaoProps) {
  if (avisos.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-sm font-semibold flex-none ${corCls}`}>
            {icone}
            {titulo}
          </span>
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full flex-none ${badgeCls}`}>
            {avisos.length}
          </span>
          <div className="flex-1 h-px bg-border/50" />
          {valorPotencial > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground flex-none">
              {fmt(valorPotencial)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground/60 mt-0.5 leading-relaxed">{subtitulo}</p>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {avisos.map(aviso => (
          <CardAviso
            key={aviso.id}
            aviso={aviso}
            onMarcado={onMarcado}
            catalogo={catalogo}
            percentualComissao={percentuaisPorVendedora[aviso.vendedora_id] ?? 0}
            loja_id={loja_id}
            isVendedora={isVendedora}
          />
        ))}
      </div>
    </div>
  )
}

// ── Lista principal ─────────────────────────────────────────────────────────

export function AvisosLista({ avisos: avisosIniciais, hoje, catalogo, percentuaisPorVendedora, loja_id, isVendedora }: AvisosListaProps) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [tipo, setTipo] = useState<TipoFiltro>('todos')
  const [lista, setLista] = useState<AvisoDetalhado[]>(avisosIniciais)

  // Sync with fresh server data after router.refresh()
  useEffect(() => {
    setLista(avisosIniciais)
  }, [avisosIniciais])

  function handleMarcado(id: string) {
    setLista(prev => prev.filter(a => a.id !== id))
    router.refresh()
  }

  const limite7 = addDays(hoje, 7)

  // Summary stats — computed from live lista so they update when cards are removed
  const seenVendas = new Set<string>()
  const potencialAberto = lista
    .filter(a => a.tipo === 'recompra' || a.tipo === 'oferta')
    .filter(a => {
      if (!a.venda_id) return true
      if (seenVendas.has(a.venda_id)) return false
      seenVendas.add(a.venda_id)
      return true
    })
    .reduce((s, a) => s + Number(a.valor_venda || 0), 0)
  const qtdAtrasados = lista.filter(a => a.data_aviso < hoje).length
  const qtdHoje = lista.filter(a => a.data_aviso === hoje).length
  const qtdProximos7 = lista.filter(a => a.data_aviso > hoje && a.data_aviso <= limite7).length

  // Filtra por tipo (aplicado em toda a lógica de contagem e exibição)
  const listaPorTipo = lista.filter(a => tipo === 'todos' || a.tipo === tipo)

  // Contadores por período (sobre a lista já filtrada por tipo)
  const counts: Record<Periodo, number> = {
    todos:     listaPorTipo.length,
    atrasados: listaPorTipo.filter(a => a.data_aviso < hoje).length,
    hoje:      listaPorTipo.filter(a => a.data_aviso === hoje).length,
    proximos7: listaPorTipo.filter(a => a.data_aviso > hoje && a.data_aviso <= limite7).length,
  }

  // Grupos para a view "todos"
  const grupos = {
    atrasados: listaPorTipo.filter(a => a.data_aviso < hoje),
    hoje:      listaPorTipo.filter(a => a.data_aviso === hoje),
    proximos7: listaPorTipo.filter(a => a.data_aviso > hoje && a.data_aviso <= limite7),
    futuros:   listaPorTipo.filter(a => a.data_aviso > limite7),
  }

  // Lista filtrada para vistas de período único (sem grouping)
  const avisosFiltrados = listaPorTipo.filter(a => {
    if (periodo === 'atrasados') return a.data_aviso < hoje
    if (periodo === 'hoje')      return a.data_aviso === hoje
    if (periodo === 'proximos7') return a.data_aviso > hoje && a.data_aviso <= limite7
    return true
  })

  const periodos: { value: Periodo; label: string }[] = [
    { value: 'todos',     label: 'Todos' },
    { value: 'atrasados', label: 'Atrasados' },
    { value: 'hoje',      label: 'Hoje' },
    { value: 'proximos7', label: 'Próximos 7 dias' },
  ]

  return (
    <div className="space-y-4">

      {/* ── Cards de resumo (reactivos ao estado local) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/65 dark:text-emerald-400/60 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 flex-none" />
            Vendas em aberto
          </p>
          <p className="text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300 leading-none">
            {fmt(potencialAberto)}
          </p>
          <p className="text-[11px] text-emerald-700/55 dark:text-emerald-400/50 leading-tight">vendas a reativar</p>
        </div>
        <div className="rounded-xl border bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/30 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600/65 dark:text-red-400/60 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 flex-none" />
            Atrasados
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${qtdAtrasados > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
            {qtdAtrasados}
          </p>
          <p className="text-[11px] text-red-600/55 dark:text-red-400/50 leading-tight">precisam de ação agora</p>
        </div>
        <div className="rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600/65 dark:text-blue-400/60 flex items-center gap-1.5">
            <Bell className="h-3 w-3 flex-none" />
            Para hoje
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${qtdHoje > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
            {qtdHoje}
          </p>
          <p className="text-[11px] text-blue-600/55 dark:text-blue-400/50 leading-tight">clientes para acionar</p>
        </div>
        <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
            <Calendar className="h-3 w-3 flex-none" />
            Próximos 7 dias
          </p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${qtdProximos7 > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
            {qtdProximos7}
          </p>
          <p className="text-[11px] text-muted-foreground/55 leading-tight">oportunidades chegando</p>
        </div>
      </div>

      {/* ── Filtros de período ── */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit flex-wrap">
        {periodos.map(({ value, label }) => {
          const count = counts[value]
          const ativo = periodo === value
          return (
            <button
              key={value}
              onClick={() => setPeriodo(value)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                ativo
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 tabular-nums leading-none font-semibold ${
                  ativo
                    ? value === 'atrasados' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                    : value === 'hoje'      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'bg-muted text-muted-foreground'
                    : 'bg-muted/60 text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filtros de tipo ── */}
      <div className="flex flex-wrap gap-2">
        {TIPOS.map(({ value, label }) => {
          const count = lista.filter(a => {
            const matchPeriodo =
              periodo === 'atrasados' ? a.data_aviso < hoje :
              periodo === 'hoje'      ? a.data_aviso === hoje :
              periodo === 'proximos7' ? a.data_aviso > hoje && a.data_aviso <= limite7 :
              true
            return matchPeriodo && (value === 'todos' || a.tipo === value)
          }).length

          const ativo = tipo === value
          return (
            <button
              key={value}
              onClick={() => setTipo(value)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                ativo
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                  ativo ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Lista agrupada (modo "todos") ── */}
      {periodo === 'todos' ? (
        <div className="space-y-6">
          <SecaoAvisos
            titulo="Atrasados"
            subtitulo="Clientes que já deveriam ter sido acionados"
            avisos={grupos.atrasados}
            corCls="text-red-700 dark:text-red-400"
            badgeCls="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            icone={<AlertCircle className="h-4 w-4" />}
            valorPotencial={grupos.atrasados.reduce((s, a) => s + a.valor_venda, 0)}
            onMarcado={handleMarcado}
            catalogo={catalogo}
            percentuaisPorVendedora={percentuaisPorVendedora}
            loja_id={loja_id}
            isVendedora={isVendedora}
          />
          <SecaoAvisos
            titulo="Hoje"
            subtitulo="Clientes para acionar hoje"
            avisos={grupos.hoje}
            corCls="text-blue-700 dark:text-blue-400"
            badgeCls="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            icone={<Bell className="h-4 w-4" />}
            valorPotencial={grupos.hoje.reduce((s, a) => s + a.valor_venda, 0)}
            onMarcado={handleMarcado}
            catalogo={catalogo}
            percentuaisPorVendedora={percentuaisPorVendedora}
            loja_id={loja_id}
            isVendedora={isVendedora}
          />
          <SecaoAvisos
            titulo="Próximos dias"
            subtitulo="Oportunidades chegando nos próximos 7 dias"
            avisos={grupos.proximos7}
            corCls="text-emerald-700 dark:text-emerald-400"
            badgeCls="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            icone={<Calendar className="h-4 w-4" />}
            valorPotencial={grupos.proximos7.reduce((s, a) => s + a.valor_venda, 0)}
            onMarcado={handleMarcado}
            catalogo={catalogo}
            percentuaisPorVendedora={percentuaisPorVendedora}
            loja_id={loja_id}
            isVendedora={isVendedora}
          />
          {grupos.futuros.length > 0 && (
            <SecaoAvisos
              titulo="Mais adiante"
              subtitulo="Avisos além dos próximos 7 dias"
              avisos={grupos.futuros}
              corCls="text-muted-foreground"
              badgeCls="bg-muted text-muted-foreground"
              icone={<Calendar className="h-4 w-4" />}
              valorPotencial={grupos.futuros.reduce((s, a) => s + a.valor_venda, 0)}
              onMarcado={handleMarcado}
              catalogo={catalogo}
              percentuaisPorVendedora={percentuaisPorVendedora}
              loja_id={loja_id}
              isVendedora={isVendedora}
            />
          )}
          {listaPorTipo.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum aviso pendente.</p>
          )}
        </div>
      ) : (
        /* ── Vista de período único — lista plana ── */
        <div>
          {avisosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {periodo === 'atrasados' ? 'Nenhum aviso atrasado.' :
               periodo === 'hoje'      ? 'Nenhum aviso para hoje.' :
               'Nenhum aviso neste período.'}
            </p>
          ) : (
            <div className="space-y-3">
              {avisosFiltrados.map(aviso => (
                <CardAviso
                  key={aviso.id}
                  aviso={aviso}
                  onMarcado={handleMarcado}
                  catalogo={catalogo}
                  percentualComissao={percentuaisPorVendedora[aviso.vendedora_id] ?? 0}
                  loja_id={loja_id}
                  isVendedora={isVendedora}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
