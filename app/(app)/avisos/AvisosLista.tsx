'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { AlertCircle, Bell, Calendar, TrendingUp, RefreshCw, Search, X } from 'lucide-react'
import { CardAviso } from './CardAviso'
import { CardGrupoRecompra } from './CardGrupoRecompra'
import type { AvisoDetalhado, GrupoRecompra } from './types'
import type { CatalogoProduto } from './page'

export interface VendedoraLoja {
  id: string
  nome: string
  percentual: number
}

interface AvisosListaProps {
  avisos: AvisoDetalhado[]
  hoje: string
  catalogo: CatalogoProduto[]
  percentuaisPorVendedora: Record<string, number>
  vendedorasLoja?: VendedoraLoja[]
  loja_id: string
  loja_nome?: string
  isVendedora: boolean
  mode: 'recompra' | 'relacionamento'
  totalRecomprasValorMes?: number
  qtdRecomprasMes?: number
}

type Periodo = 'todos' | 'atrasados' | 'hoje' | 'proximos7'
type TipoFiltro = 'todos' | AvisoDetalhado['tipo']

const TIPOS_RECOMPRA: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'recompra', label: 'Recompra' },
  { value: 'oferta', label: 'Oferta' },
]

const TIPOS_RELACIONAMENTO: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'agradecimento', label: 'Agradecimento' },
  { value: 'relacionamento', label: 'Relacionamento' },
]

function agruparPorVenda(avisos: AvisoDetalhado[]): GrupoRecompra[] {
  const mapa = new Map<string, AvisoDetalhado[]>()
  for (const a of avisos) {
    if (!mapa.has(a.venda_id)) mapa.set(a.venda_id, [])
    mapa.get(a.venda_id)!.push(a)
  }
  return Array.from(mapa.values()).map(grupo => {
    const sorted = [...grupo].sort((a, b) => a.data_aviso.localeCompare(b.data_aviso))
    const primary = sorted[0]
    return {
      venda_id: primary.venda_id,
      avisos: sorted,
      cliente_nome: primary.cliente_nome,
      cliente_whatsapp: primary.cliente_whatsapp,
      cliente_id: primary.cliente_id,
      vendedora_id: primary.vendedora_id,
      vendedora_nome: primary.vendedora_nome,
      data_aviso: primary.data_aviso,
      data_compra: primary.data_compra,
      atrasado: primary.atrasado,
      valor_total: grupo.reduce((s, a) => s + a.valor_produto, 0),
    }
  })
}

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
  onMarcado: (id: string, fecharOppKey?: string) => void
  onReagendado: (vendaId: string, novaData: string) => void
  onGrupoMarcado: (venda_id: string) => void
  onGrupoReagendado: (venda_id: string, novaData: string) => void
  catalogo: CatalogoProduto[]
  percentuaisPorVendedora: Record<string, number>
  vendedorasLoja?: VendedoraLoja[]
  loja_id: string
  loja_nome: string
  isVendedora: boolean
  mode: 'recompra' | 'relacionamento'
}

function SecaoAvisos({
  titulo, subtitulo, avisos, corCls, badgeCls, icone, valorPotencial,
  onMarcado, onReagendado, onGrupoMarcado, onGrupoReagendado,
  catalogo, percentuaisPorVendedora, vendedorasLoja, loja_id, loja_nome, isVendedora, mode,
}: SecaoProps) {
  const grupos = mode === 'recompra' ? agruparPorVenda(avisos) : null
  const displayCount = grupos ? grupos.length : avisos.length
  if (displayCount === 0) return null

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
            {displayCount}
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
        {grupos ? grupos.map(grupo =>
          grupo.avisos.length === 1 ? (
            <CardAviso
              key={grupo.avisos[0].id}
              aviso={grupo.avisos[0]}
              onMarcado={onMarcado}
              onReagendado={onReagendado}
              catalogo={catalogo}
              percentualComissao={percentuaisPorVendedora[grupo.avisos[0].vendedora_id] ?? 0}
              vendedorasLoja={vendedorasLoja}
              loja_id={loja_id}
              isVendedora={isVendedora}
            />
          ) : (
            <CardGrupoRecompra
              key={grupo.venda_id}
              grupo={grupo}
              onGrupoMarcado={onGrupoMarcado}
              onGrupoReagendado={onGrupoReagendado}
              catalogo={catalogo}
              percentualComissao={percentuaisPorVendedora[grupo.vendedora_id] ?? 0}
              vendedorasLoja={vendedorasLoja}
              loja_id={loja_id}
              loja_nome={loja_nome}
              isVendedora={isVendedora}
            />
          )
        ) : avisos.map(aviso => (
          <CardAviso
            key={aviso.id}
            aviso={aviso}
            onMarcado={onMarcado}
            onReagendado={onReagendado}
            catalogo={catalogo}
            percentualComissao={percentuaisPorVendedora[aviso.vendedora_id] ?? 0}
            vendedorasLoja={vendedorasLoja}
            loja_id={loja_id}
            isVendedora={isVendedora}
          />
        ))}
      </div>
    </div>
  )
}

// ── Lista principal ─────────────────────────────────────────────────────────

export function AvisosLista({ avisos: avisosIniciais, hoje, catalogo, percentuaisPorVendedora, vendedorasLoja, loja_id, loja_nome = '', isVendedora, mode, totalRecomprasValorMes = 0, qtdRecomprasMes = 0 }: AvisosListaProps) {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo>('todos')
  const [tipo, setTipo] = useState<TipoFiltro>('todos')
  const [lista, setLista] = useState<AvisoDetalhado[]>(avisosIniciais)
  const [busca, setBusca] = useState('')
  const [produtoFiltro, setProdutoFiltro] = useState('')
  const [dataEspecifica, setDataEspecifica] = useState('')
  const [tipData, setTipData] = useState<'retorno' | 'compra'>('retorno')

  // Sync with fresh server data after router.refresh()
  useEffect(() => {
    setLista(avisosIniciais)
  }, [avisosIniciais])

  const produtosUnicos = useMemo(
    () => [...new Set(lista.map(a => a.produto_nome))].sort(),
    [lista]
  )

  const temFiltrosBusca = busca !== '' || produtoFiltro !== '' || dataEspecifica !== ''
  const temFiltrosAtivos = temFiltrosBusca || periodo !== 'todos' || tipo !== 'todos'

  function limparFiltros() {
    setBusca('')
    setProdutoFiltro('')
    setDataEspecifica('')
    setTipData('retorno')
    setPeriodo('todos')
    setTipo('todos')
  }

  function oppKey(a: AvisoDetalhado) {
    return a.item_venda_id ?? a.venda_id
  }

  function handleMarcado(id: string, fecharOppKey?: string) {
    setLista(prev => fecharOppKey
      ? prev.filter(a => oppKey(a) !== fecharOppKey)
      : prev.filter(a => a.id !== id)
    )
    router.refresh()
  }

  function handleReagendado(key: string, novaData: string) {
    setLista(prev => prev.map(a =>
      oppKey(a) === key
        ? { ...a, data_aviso: novaData, status: 'reagendada' as AvisoDetalhado['status'], atrasado: novaData < hoje }
        : a
    ))
    router.refresh()
  }

  function handleGrupoMarcado(venda_id: string) {
    setLista(prev => prev.filter(a => a.venda_id !== venda_id))
    router.refresh()
  }

  function handleGrupoReagendado(venda_id: string, novaData: string) {
    setLista(prev => prev.map(a =>
      a.venda_id === venda_id
        ? { ...a, data_aviso: novaData, status: 'reagendada' as AvisoDetalhado['status'], atrasado: novaData < hoje }
        : a
    ))
    router.refresh()
  }

  const limite7 = addDays(hoje, 7)
  const limite90 = addDays(hoje, 90)
  const inicioMes = hoje.slice(0, 8) + '01'
  const fimMes = (() => {
    const [y, m] = hoje.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  })()

  // Financial metric — unique recompra/oferta opportunities in the next 90 days (includes overdue)
  const seenOpps = new Set<string>()
  let potencialAberto = 0
  let qtdOportunidades = 0
  for (const a of lista) {
    if (a.tipo !== 'recompra' && a.tipo !== 'oferta') continue
    if (a.data_aviso > limite90) continue
    const key = `${a.venda_id}__${a.produto_id ?? ''}`
    if (seenOpps.has(key)) continue
    seenOpps.add(key)
    potencialAberto += Number(a.valor_produto || a.valor_venda || 0)
    qtdOportunidades++
  }

  // Financial metric — unique opportunities with data_aviso in the current month
  const seenMes = new Set<string>()
  let potencialMes = 0
  let qtdOportunidadesMes = 0
  for (const a of lista) {
    if (a.tipo !== 'recompra' && a.tipo !== 'oferta') continue
    if (a.data_aviso < inicioMes || a.data_aviso > fimMes) continue
    const key = `${a.venda_id}__${a.produto_id ?? ''}`
    if (seenMes.has(key)) continue
    seenMes.add(key)
    potencialMes += Number(a.valor_produto || a.valor_venda || 0)
    qtdOportunidadesMes++
  }

  // Aviso counts — operational queue (all types, all time buckets)
  const qtdAtrasados = lista.filter(a => a.data_aviso < hoje).length
  const qtdHoje = lista.filter(a => a.data_aviso === hoje).length
  const qtdProximos7 = lista.filter(a => a.data_aviso > hoje && a.data_aviso <= limite7).length

  // Filtra por busca/produto/data (antes de tipo, para que contadores de tipo reflitam a busca)
  const listaComFiltrosBusca = lista.filter(a => {
    if (busca) {
      const q = busca.toLowerCase()
      const digits = busca.replace(/\D/g, '')
      const matchNome = a.cliente_nome.toLowerCase().includes(q)
      const matchWhatsapp = digits.length >= 4 && a.cliente_whatsapp.includes(digits)
      const matchProduto = a.produto_nome.toLowerCase().includes(q)
      if (!matchNome && !matchWhatsapp && !matchProduto) return false
    }
    if (produtoFiltro && a.produto_nome !== produtoFiltro) return false
    if (dataEspecifica) {
      const campoData = tipData === 'compra' ? a.data_compra : a.data_aviso
      if (campoData !== dataEspecifica) return false
    }
    return true
  })

  // Filtra por tipo
  const listaPorTipo = listaComFiltrosBusca.filter(a => tipo === 'todos' || a.tipo === tipo)

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

        {/* Card 1: financeiro principal — 90 dias (recompra) / pendentes (relacionamento) */}
        {mode === 'recompra' ? (
          <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/65 dark:text-emerald-400/60 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 flex-none" />
              Recompras em aberto
            </p>
            <p className="text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300 leading-none">
              {fmt(potencialAberto)}
            </p>
            <p className="text-[11px] text-emerald-700/55 dark:text-emerald-400/50 leading-tight">
              {qtdOportunidades} {qtdOportunidades === 1 ? 'recompra no radar' : 'recompras no radar'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-violet-50 dark:bg-violet-950/20 border-violet-200/80 dark:border-violet-800/40 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-700/65 dark:text-violet-400/60 flex items-center gap-1.5">
              <Bell className="h-3 w-3 flex-none" />
              Avisos pendentes
            </p>
            <p className="text-xl font-bold tabular-nums text-violet-800 dark:text-violet-300 leading-none">
              {lista.length}
            </p>
            <p className="text-[11px] text-violet-700/55 dark:text-violet-400/50 leading-tight">
              mensagens de relacionamento
            </p>
          </div>
        )}

        {/* Card 2: Recompras do mês (recompra) / Atrasados (relacionamento) */}
        {mode === 'recompra' ? (
          <div className="rounded-xl border bg-blue-50/70 dark:bg-blue-950/15 border-blue-200/70 dark:border-blue-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700/65 dark:text-blue-400/60 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 flex-none" />
              Recompras em aberto do mês
            </p>
            <p className="text-xl font-bold tabular-nums text-blue-800 dark:text-blue-300 leading-none">
              {fmt(potencialMes)}
            </p>
            <p className="text-[11px] text-blue-700/55 dark:text-blue-400/50 leading-tight">
              {qtdOportunidadesMes} {qtdOportunidadesMes === 1 ? 'aberta no mês' : 'abertas no mês'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600/65 dark:text-red-400/60 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 flex-none" />
              Avisos atrasados
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${qtdAtrasados > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
              {qtdAtrasados}
            </p>
            <p className="text-[11px] text-red-600/55 dark:text-red-400/50 leading-tight">com ação pendente</p>
          </div>
        )}

        {/* Card 3: Recuperado (recompra) / Para hoje (relacionamento) */}
        {mode === 'recompra' ? (
          <div className="rounded-xl border bg-emerald-50/60 dark:bg-emerald-950/15 border-emerald-100/80 dark:border-emerald-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/65 dark:text-emerald-400/60 flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 flex-none" />
              Recuperado
            </p>
            <p className="text-xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300 leading-none">
              {fmt(totalRecomprasValorMes)}
            </p>
            <p className="text-[11px] text-emerald-700/55 dark:text-emerald-400/50 leading-tight">
              {qtdRecomprasMes} {qtdRecomprasMes === 1 ? 'recompra este mês' : 'recompras este mês'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600/65 dark:text-blue-400/60 flex items-center gap-1.5">
              <Bell className="h-3 w-3 flex-none" />
              Avisos para hoje
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${qtdHoje > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'}`}>
              {qtdHoje}
            </p>
            <p className="text-[11px] text-blue-600/55 dark:text-blue-400/50 leading-tight">mensagens para enviar</p>
          </div>
        )}

        {/* Card 4: Avisos atrasados (recompra) / Próximos 7D (relacionamento) */}
        {mode === 'recompra' ? (
          <div className="rounded-xl border bg-red-50/70 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600/65 dark:text-red-400/60 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 flex-none" />
              Avisos atrasados
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${qtdAtrasados > 0 ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
              {qtdAtrasados}
            </p>
            <p className="text-[11px] text-red-600/55 dark:text-red-400/50 leading-tight">com ação pendente</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
              <Calendar className="h-3 w-3 flex-none" />
              Avisos próximos 7d
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${qtdProximos7 > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {qtdProximos7}
            </p>
            <p className="text-[11px] text-muted-foreground/55 leading-tight">na fila de contato</p>
          </div>
        )}

      </div>

      {/* ── Busca e filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cliente, WhatsApp ou produto…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-8 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {produtosUnicos.length > 1 && (
          <select
            value={produtoFiltro}
            onChange={e => setProdutoFiltro(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-48"
          >
            <option value="">Todos os produtos</option>
            {produtosUnicos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        )}

        <div className="flex rounded-lg border border-input overflow-hidden">
          {mode === 'recompra' && (
            <select
              value={tipData}
              onChange={e => setTipData(e.target.value as 'retorno' | 'compra')}
              className="bg-background pl-2.5 pr-1 py-2 text-xs text-muted-foreground border-r border-input focus:outline-none focus:ring-0 shrink-0"
              aria-label="Tipo de data"
            >
              <option value="retorno">Retorno</option>
              <option value="compra">Compra</option>
            </select>
          )}
          <input
            type="date"
            value={dataEspecifica}
            onChange={e => setDataEspecifica(e.target.value)}
            className="bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-36"
          />
        </div>

        {temFiltrosAtivos && (
          <button
            onClick={limparFiltros}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        )}
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
        {(mode === 'recompra' ? TIPOS_RECOMPRA : TIPOS_RELACIONAMENTO).map(({ value, label }) => {
          const count = listaComFiltrosBusca.filter(a => {
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
            subtitulo={mode === 'recompra' ? 'Recompras que já deveriam ter sido acionadas' : 'Mensagens que já deveriam ter sido enviadas'}
            avisos={grupos.atrasados}
            corCls="text-red-700 dark:text-red-400"
            badgeCls="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            icone={<AlertCircle className="h-4 w-4" />}
            valorPotencial={mode === 'recompra' ? grupos.atrasados.reduce((s, a) => s + a.valor_produto, 0) : 0}
            onMarcado={handleMarcado}
            onReagendado={handleReagendado}
            onGrupoMarcado={handleGrupoMarcado}
            onGrupoReagendado={handleGrupoReagendado}
            catalogo={catalogo}
            percentuaisPorVendedora={percentuaisPorVendedora}
            vendedorasLoja={vendedorasLoja}
            loja_id={loja_id}
            loja_nome={loja_nome}
            isVendedora={isVendedora}
            mode={mode}
          />
          <SecaoAvisos
            titulo="Hoje"
            subtitulo={mode === 'recompra' ? 'Clientes para recomprar hoje' : 'Clientes para contatar hoje'}
            avisos={grupos.hoje}
            corCls="text-blue-700 dark:text-blue-400"
            badgeCls="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            icone={<Bell className="h-4 w-4" />}
            valorPotencial={mode === 'recompra' ? grupos.hoje.reduce((s, a) => s + a.valor_produto, 0) : 0}
            onMarcado={handleMarcado}
            onReagendado={handleReagendado}
            onGrupoMarcado={handleGrupoMarcado}
            onGrupoReagendado={handleGrupoReagendado}
            catalogo={catalogo}
            percentuaisPorVendedora={percentuaisPorVendedora}
            vendedorasLoja={vendedorasLoja}
            loja_id={loja_id}
            loja_nome={loja_nome}
            isVendedora={isVendedora}
            mode={mode}
          />
          <SecaoAvisos
            titulo="Próximos dias"
            subtitulo={mode === 'recompra' ? 'Oportunidades chegando nos próximos 7 dias' : 'Mensagens dos próximos 7 dias'}
            avisos={grupos.proximos7}
            corCls="text-emerald-700 dark:text-emerald-400"
            badgeCls="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            icone={<Calendar className="h-4 w-4" />}
            valorPotencial={mode === 'recompra' ? grupos.proximos7.reduce((s, a) => s + a.valor_produto, 0) : 0}
            onMarcado={handleMarcado}
            onReagendado={handleReagendado}
            onGrupoMarcado={handleGrupoMarcado}
            onGrupoReagendado={handleGrupoReagendado}
            catalogo={catalogo}
            percentuaisPorVendedora={percentuaisPorVendedora}
            vendedorasLoja={vendedorasLoja}
            loja_id={loja_id}
            loja_nome={loja_nome}
            isVendedora={isVendedora}
            mode={mode}
          />
          {grupos.futuros.length > 0 && (
            <SecaoAvisos
              titulo="Mais adiante"
              subtitulo="Além dos próximos 7 dias"
              avisos={grupos.futuros}
              corCls="text-muted-foreground"
              badgeCls="bg-muted text-muted-foreground"
              icone={<Calendar className="h-4 w-4" />}
              valorPotencial={0}
              onMarcado={handleMarcado}
              onReagendado={handleReagendado}
              onGrupoMarcado={handleGrupoMarcado}
              onGrupoReagendado={handleGrupoReagendado}
              catalogo={catalogo}
              percentuaisPorVendedora={percentuaisPorVendedora}
              vendedorasLoja={vendedorasLoja}
              loja_id={loja_id}
              loja_nome={loja_nome}
              isVendedora={isVendedora}
              mode={mode}
            />
          )}
          {listaPorTipo.length === 0 && (
            <div className="text-sm text-muted-foreground space-y-1">
              {temFiltrosBusca ? (
                <>
                  <p>
                    Nenhuma recompra encontrada com esses filtros.{' '}
                    <button onClick={limparFiltros} className="text-primary hover:underline">Limpar filtros</button>
                  </p>
                  {dataEspecifica && mode === 'recompra' && (
                    <p className="text-xs text-muted-foreground/70">
                      Filtrando por <span className="font-medium">{tipData === 'compra' ? 'data da compra' : 'data do retorno'}</span>.
                      {tipData === 'retorno'
                        ? ' Tente mudar para "Compra" se quiser buscar pela data da venda original.'
                        : ' Tente mudar para "Retorno" se quiser buscar pela data agendada do aviso.'}
                    </p>
                  )}
                </>
              ) : (
                <p>{mode === 'recompra' ? 'Nenhuma recompra pendente.' : 'Nenhuma mensagem de relacionamento pendente.'}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Vista de período único — lista plana ── */
        <div>
          {avisosFiltrados.length === 0 ? (
            <div className="text-sm text-muted-foreground space-y-1">
              {temFiltrosBusca ? (
                <>
                  <p>
                    Nenhuma recompra encontrada com esses filtros.{' '}
                    <button onClick={limparFiltros} className="text-primary hover:underline">Limpar filtros</button>
                  </p>
                  {dataEspecifica && mode === 'recompra' && (
                    <p className="text-xs text-muted-foreground/70">
                      Filtrando por <span className="font-medium">{tipData === 'compra' ? 'data da compra' : 'data do retorno'}</span>.
                      {tipData === 'retorno'
                        ? ' Tente mudar para "Compra" se quiser buscar pela data da venda original.'
                        : ' Tente mudar para "Retorno" se quiser buscar pela data agendada do aviso.'}
                    </p>
                  )}
                </>
              ) : (
                <p>
                  {periodo === 'atrasados' ? 'Nenhum aviso atrasado.' :
                   periodo === 'hoje'      ? 'Nenhum aviso para hoje.' :
                   'Nenhum aviso neste período.'}
                </p>
              )}
            </div>
          ) : mode === 'recompra' ? (
            <div className="space-y-3">
              {agruparPorVenda(avisosFiltrados).map(grupo =>
                grupo.avisos.length === 1 ? (
                  <CardAviso
                    key={grupo.avisos[0].id}
                    aviso={grupo.avisos[0]}
                    onMarcado={handleMarcado}
                    onReagendado={handleReagendado}
                    catalogo={catalogo}
                    percentualComissao={percentuaisPorVendedora[grupo.avisos[0].vendedora_id] ?? 0}
                    vendedorasLoja={vendedorasLoja}
                    loja_id={loja_id}
                    isVendedora={isVendedora}
                  />
                ) : (
                  <CardGrupoRecompra
                    key={grupo.venda_id}
                    grupo={grupo}
                    onGrupoMarcado={handleGrupoMarcado}
                    onGrupoReagendado={handleGrupoReagendado}
                    catalogo={catalogo}
                    percentualComissao={percentuaisPorVendedora[grupo.vendedora_id] ?? 0}
                    vendedorasLoja={vendedorasLoja}
                    loja_id={loja_id}
                    loja_nome={loja_nome}
                    isVendedora={isVendedora}
                  />
                )
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {avisosFiltrados.map(aviso => (
                <CardAviso
                  key={aviso.id}
                  aviso={aviso}
                  onMarcado={handleMarcado}
                  onReagendado={handleReagendado}
                  catalogo={catalogo}
                  percentualComissao={percentuaisPorVendedora[aviso.vendedora_id] ?? 0}
                  vendedorasLoja={vendedorasLoja}
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
