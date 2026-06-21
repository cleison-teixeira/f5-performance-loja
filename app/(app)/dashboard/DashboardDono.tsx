'use client'

import Link from 'next/link'
import {
  ChevronRight, Package, Bell, ShoppingBag, TrendingUp, Target, AlertCircle,
} from 'lucide-react'
import { ComissaoChart } from './ComissaoChart'
import type { VendedoraRankingMeta, DinheiroMesaInfo, AvisosPrazoInfo, ProdutoTopMes } from './page'

interface Props {
  loja: { id: string; nome: string }
  dinheiroMesaInfo: DinheiroMesaInfo
  totalVendasMes: number
  metaVendasMes: number | null
  diasRestantes: number
  rankingMes: VendedoraRankingMeta[]
  avisosPrazo: AvisosPrazoInfo
  topProdutosMes: ProdutoTopMes[]
  vendasDiariaMes: number[]
  diasMes: string[]
  hojeDia: number
  mesLabel: string
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const AVATAR_BG = ['bg-amber-500', 'bg-slate-400', 'bg-orange-400', 'bg-blue-400', 'bg-violet-400']
const RANK_STYLE = [
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
  'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
]

function MoneyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 172 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="dm-n1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="dm-n2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="dm-n3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <radialGradient id="dm-ca" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <radialGradient id="dm-cb" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="55%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>

      {/* Note 1 — back, most rotated */}
      <rect x="14" y="16" width="120" height="72" rx="9"
        fill="url(#dm-n1)" opacity="0.70"
        transform="rotate(-15 74 52)"
      />

      {/* Note 2 — middle */}
      <rect x="14" y="16" width="120" height="72" rx="9"
        fill="url(#dm-n2)" opacity="0.86"
        transform="rotate(-6 74 52)"
      />
      <rect x="20" y="22" width="108" height="60" rx="6"
        fill="none" stroke="#34d399" strokeWidth="0.7" opacity="0.3"
        transform="rotate(-6 74 52)"
      />

      {/* Note 3 — front */}
      <rect x="14" y="16" width="120" height="72" rx="9" fill="url(#dm-n3)" />
      <rect x="20" y="22" width="108" height="60" rx="6"
        fill="none" stroke="#a7f3d0" strokeWidth="0.8" opacity="0.45"
      />
      {/* seal */}
      <circle cx="40" cy="52" r="14" fill="#059669" />
      <circle cx="40" cy="52" r="10" fill="none" stroke="#6ee7b7" strokeWidth="0.7" opacity="0.45" />
      {/* denomination lines */}
      <line x1="62" y1="33" x2="116" y2="33" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="41" x2="116" y2="41" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="49" x2="116" y2="49" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="57" x2="110" y2="57" stroke="#a7f3d0" strokeWidth="1" opacity="0.4" />
      <line x1="62" y1="65" x2="98" y2="65" stroke="#a7f3d0" strokeWidth="0.9" opacity="0.35" />
      {/* corner boxes */}
      <rect x="20" y="20" width="13" height="8" rx="2" fill="#047857" opacity="0.65" />
      <rect x="115" y="60" width="13" height="8" rx="2" fill="#047857" opacity="0.65" />

      {/* Coin B — behind left */}
      <circle cx="106" cy="120" r="16" fill="url(#dm-cb)" opacity="0.82" />
      <circle cx="106" cy="120" r="16" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.45" />
      <circle cx="102" cy="116" r="7" fill="white" opacity="0.07" />

      {/* Coin C — upper right, smaller */}
      <circle cx="150" cy="106" r="12" fill="url(#dm-cb)" opacity="0.88" />
      <circle cx="150" cy="106" r="12" fill="none" stroke="#f59e0b" strokeWidth="0.7" opacity="0.5" />
      <circle cx="147" cy="103" r="5" fill="white" opacity="0.09" />

      {/* Coin A — front, largest */}
      <circle cx="126" cy="112" r="21" fill="url(#dm-ca)" />
      <circle cx="126" cy="112" r="21" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.6" />
      <circle cx="121" cy="107" r="9" fill="white" opacity="0.10" />
    </svg>
  )
}

export function DashboardDono({
  loja,
  dinheiroMesaInfo,
  totalVendasMes,
  metaVendasMes,
  diasRestantes,
  rankingMes,
  avisosPrazo,
  topProdutosMes,
  vendasDiariaMes,
  diasMes,
  hojeDia,
  mesLabel,
}: Props) {
  const { totalPotencial, qtdOportunidades, potencial7Dias, qtdClientes7Dias } = dinheiroMesaInfo

  const pctMeta = metaVendasMes && metaVendasMes > 0
    ? Math.round((totalVendasMes / metaVendasMes) * 100)
    : null
  const pctClamped = pctMeta !== null ? Math.min(pctMeta, 100) : 0
  const falta = metaVendasMes ? Math.max(metaVendasMes - totalVendasMes, 0) : 0

  // Derived meta theme — all classes are static strings for Tailwind to detect
  const metaBar = pctMeta === null ? 'from-slate-400 to-slate-500'
    : pctMeta >= 100 ? 'from-emerald-500 to-green-500'
    : pctMeta >= 75  ? 'from-blue-500 to-blue-600'
    : pctMeta >= 40  ? 'from-amber-500 to-orange-500'
    :                  'from-red-500 to-red-600'

  const metaTxtColor = pctMeta === null ? 'text-muted-foreground'
    : pctMeta >= 100 ? 'text-emerald-600 dark:text-emerald-400'
    : pctMeta >= 75  ? 'text-blue-600 dark:text-blue-400'
    : pctMeta >= 40  ? 'text-amber-600 dark:text-amber-400'
    :                  'text-red-600 dark:text-red-400'

  const metaPillCls = pctMeta === null ? 'bg-muted text-muted-foreground'
    : pctMeta >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    : pctMeta >= 75  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
    : pctMeta >= 40  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    :                  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'

  const metaPillLabel = pctMeta === null ? ''
    : pctMeta >= 100 ? 'Meta batida!'
    : pctMeta >= 75  ? 'Bom ritmo'
    : pctMeta >= 40  ? 'Em evolução'
    :                  'Atenção'

  const ringStroke = pctMeta === null ? '#94a3b8'
    : pctMeta >= 100 ? '#10b981'
    : pctMeta >= 75  ? '#3b82f6'
    : pctMeta >= 40  ? '#f59e0b'
    :                  '#ef4444'

  const dailyGoal = diasRestantes > 0 ? Math.ceil(falta / diasRestantes) : 0

  const totalAvisosPendentes =
    avisosPrazo.atrasados.qtd + avisosPrazo.hoje.qtd + avisosPrazo.amanha.qtd +
    avisosPrazo.em2a3.qtd + avisosPrazo.em4a7.qtd

  const potencial7DiasAvisos =
    avisosPrazo.hoje.valor + avisosPrazo.amanha.valor +
    avisosPrazo.em2a3.valor + avisosPrazo.em4a7.valor

  const prioridadeLabel = avisosPrazo.atrasados.qtd > 0
    ? 'Atrasados'
    : avisosPrazo.hoje.qtd > 0
    ? 'Hoje'
    : totalAvisosPendentes > 0
    ? 'Próx. dias'
    : '—'

  const teamTotalMes = rankingMes.reduce((s, v) => s + v.totalMes, 0)
  const teamTotalVendas = rankingMes.reduce((s, v) => s + v.qtdMes, 0)
  const teamBestPct = rankingMes.reduce((best, v) => {
    if (!v.meta || v.meta === 0) return best
    return Math.max(best, Math.min(Math.round((v.totalMes / v.meta) * 100), 100))
  }, 0)

  const prazoCards = [
    { label: 'Hoje',        data: avisosPrazo.hoje,   cardCls: 'bg-blue-50 border-blue-200/70 dark:bg-blue-950/20 dark:border-blue-800/40',               numCls: 'text-blue-700 dark:text-blue-300',      emptyNumCls: 'text-blue-200 dark:text-blue-900',          valueCls: 'text-blue-600 dark:text-blue-400' },
    { label: 'Amanhã',      data: avisosPrazo.amanha, cardCls: 'bg-amber-50/60 border-amber-100 dark:bg-amber-950/15 dark:border-amber-800/25',            numCls: 'text-amber-700 dark:text-amber-300',    emptyNumCls: 'text-amber-200 dark:text-amber-900/50',     valueCls: 'text-amber-600 dark:text-amber-400' },
    { label: 'Em 2–3 dias', data: avisosPrazo.em2a3,  cardCls: 'bg-muted/50 border-border/60',                                                             numCls: 'text-foreground',                       emptyNumCls: 'text-muted-foreground/25',                  valueCls: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Em 4–7 dias', data: avisosPrazo.em4a7,  cardCls: 'bg-emerald-50/40 border-emerald-100/60 dark:bg-emerald-950/10 dark:border-emerald-800/20', numCls: 'text-emerald-700 dark:text-emerald-400', emptyNumCls: 'text-emerald-200 dark:text-emerald-900/50', valueCls: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <div className="space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Painel da loja</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{loja.nome} · visão geral de vendas, metas e recompras</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SEÇÃO 1 — DINHEIRO NA MESA
      ══════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-[#0d4a2e] to-[#081f14]" />

        {/* Decorative glows */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-green-600/10 blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 -left-10 w-36 h-36 rounded-full bg-emerald-400/8 blur-2xl pointer-events-none" />

        <div className="relative p-6 md:p-8">

          {/* Row 1: eyebrow + pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-none">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300/90">
                Dinheiro na Mesa
              </span>
            </div>
            {qtdOportunidades > 0 && (
              <div className="bg-white/10 ring-1 ring-white/15 rounded-full px-3.5 py-1 text-xs font-semibold text-white/80">
                {qtdOportunidades} oportunidade{qtdOportunidades !== 1 ? 's' : ''} abertas
              </div>
            )}
          </div>

          {/* Row 2: two-column (left: value+stats, right: illustration+CTA on md+) */}
          <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-10">

            {/* Left column */}
            <div className="flex-1 flex flex-col gap-5">
              <div>
                <p className="text-5xl md:text-6xl font-bold tabular-nums text-white leading-none tracking-tight">
                  {fmt(totalPotencial)}
                </p>
                <p className="text-sm text-emerald-300/70 mt-2.5 font-medium">
                  potencial em recompras abertas
                </p>
                {totalPotencial === 0 && (
                  <p className="text-sm text-white/40 mt-2 italic">
                    Registre vendas para gerar oportunidades de recompra.
                  </p>
                )}
              </div>

              <div className="h-px bg-white/10" />

              <div className="grid grid-cols-3 gap-x-6">
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">
                    Oportunidades
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">{qtdOportunidades}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">
                    Próximos 7 dias
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">{fmt(potencial7Dias)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">
                    Clientes vencendo
                  </p>
                  <p className="text-2xl font-bold text-white tabular-nums">{qtdClientes7Dias}</p>
                </div>
              </div>

              {/* CTA visible on mobile only */}
              <div className="md:hidden">
                <Link
                  href="/avisos"
                  className="inline-flex items-center gap-2 bg-white text-emerald-900 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
                >
                  Ver fila de recompra
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Right column: illustration + CTA (desktop only) */}
            <div className="hidden md:flex flex-col items-end justify-between gap-4 w-36 lg:w-44 flex-none">
              <MoneyIllustration className="w-full opacity-80" />
              <Link
                href="/avisos"
                className="inline-flex items-center gap-2 bg-white text-emerald-900 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
              >
                Ver fila de recompra
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SEÇÃO 2 — META + RANKING
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* — META DO MÊS — */}
        <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800/40 flex items-center justify-center flex-none">
                <Target className="h-4 w-4 text-violet-500" />
              </div>
              <h2 className="text-sm font-semibold">Meta do mês</h2>
            </div>
            <Link
              href={metaVendasMes ? '/metas' : '/configuracoes/metas'}
              className="text-xs text-primary hover:underline"
            >
              {metaVendasMes ? 'Ver metas →' : 'Configurar meta →'}
            </Link>
          </div>

          {metaVendasMes ? (
            <>
              {/* Value row: text left, circular ring right */}
              <div className="flex items-center gap-5">
                <div className="flex-1 min-w-0">
                  <p className="text-3xl font-bold tabular-nums tracking-tight">{fmt(totalVendasMes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">de {fmt(metaVendasMes)} da meta mensal</p>
                  {pctMeta !== null && metaPillLabel && (
                    <span className={`inline-block mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${metaPillCls}`}>
                      {metaPillLabel}
                    </span>
                  )}
                </div>

                {/* Circular progress ring — r=38, circumference≈238.76 */}
                <div className="flex-none">
                  <svg viewBox="0 0 96 96" className="w-24 h-24" aria-hidden>
                    <circle
                      cx="48" cy="48" r="38"
                      fill="none"
                      strokeWidth="9"
                      className="stroke-slate-100 dark:stroke-slate-800"
                    />
                    <circle
                      cx="48" cy="48" r="38"
                      fill="none"
                      stroke={ringStroke}
                      strokeWidth="9"
                      strokeDasharray={`${(pctClamped / 100) * 238.76} 238.76`}
                      strokeLinecap="round"
                      transform="rotate(-90 48 48)"
                    />
                    <text
                      x="48" y="50"
                      textAnchor="middle"
                      style={{ fontSize: '18px', fontWeight: '700', fill: ringStroke }}
                    >
                      {pctMeta ?? 0}%
                    </text>
                    <text
                      x="48" y="63"
                      textAnchor="middle"
                      style={{ fontSize: '9px', fill: '#94a3b8' }}
                    >
                      da meta
                    </text>
                  </svg>
                </div>
              </div>

              {/* Progress bar with labels */}
              <div className="space-y-1.5">
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${metaBar}`}
                    style={{ width: `${pctClamped}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>R$ 0</span>
                  <span>{fmt(metaVendasMes)}</span>
                </div>
              </div>

              {/* Indicators or goal-reached banner */}
              {(pctMeta ?? 0) >= 100 ? (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 px-4 py-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Meta atingida este mês!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-muted/50 px-3 py-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1.5">Falta</p>
                    <p className={`text-sm font-bold tabular-nums ${(pctMeta ?? 0) < 40 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {fmt(falta)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1.5">Meta diária</p>
                    <p className="text-sm font-bold tabular-nums">
                      {diasRestantes > 0 ? fmt(dailyGoal) : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/50 px-3 py-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1.5">Dias rest.</p>
                    <p className="text-sm font-bold tabular-nums">{diasRestantes}</p>
                  </div>
                </div>
              )}

              {/* Action guidance */}
              {(pctMeta ?? 0) < 100 && diasRestantes > 0 && (
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-800/30 px-3.5 py-3 flex items-start gap-2.5">
                  <Target className="h-3.5 w-3.5 text-violet-500 flex-none mt-0.5" />
                  <p className="text-xs text-violet-700 dark:text-violet-400 leading-relaxed">
                    Vender <span className="font-bold">{fmt(dailyGoal)}/dia</span> nos próximos{' '}
                    <span className="font-bold">{diasRestantes} dias</span> para fechar a meta do mês.
                  </p>
                </div>
              )}

              {/* Evolution chart */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-3">
                  Evolução das vendas
                </p>
                <ComissaoChart
                  diasMes={diasMes}
                  comissaoDiaria={vendasDiariaMes}
                  metaValor={metaVendasMes}
                  hojeDia={hojeDia}
                  emptyTitle="Aguardando as primeiras vendas do mês"
                  emptyBody="O acumulado de vendas aparecerá aqui conforme forem registradas."
                  showProgressBar={false}
                />
              </div>
            </>
          ) : (
            /* No meta configured */
            <div className="flex flex-col gap-4">
              {totalVendasMes > 0 && (
                <div>
                  <p className="text-3xl font-bold tabular-nums">{fmt(totalVendasMes)}</p>
                  <p className="text-xs text-muted-foreground mt-1">vendido este mês — sem meta configurada</p>
                </div>
              )}
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center rounded-xl bg-muted/30 border border-dashed">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Target className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-muted-foreground">Nenhuma meta mensal configurada</p>
                  <p className="text-xs text-muted-foreground/70 max-w-[220px] mx-auto leading-relaxed">
                    Configure uma meta para acompanhar o ritmo comercial da sua loja.
                  </p>
                </div>
                <Link
                  href="/configuracoes/metas"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Configurar meta <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* — RANKING DA EQUIPE — */}
        <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold">Ranking da equipe</h2>
            </div>
            <Link href="/configuracoes/equipe" className="text-xs text-primary hover:underline">
              Ver equipe →
            </Link>
          </div>

          {rankingMes.length > 0 ? (
            <>
            <div className="space-y-1">
              {rankingMes.slice(0, 5).map((v, i) => {
                const pctV = v.meta && v.meta > 0
                  ? Math.min(Math.round((v.totalMes / v.meta) * 100), 100)
                  : null
                const status = pctV !== null
                  ? pctV >= 80 ? 'Excelente' : pctV >= 60 ? 'Muito bem' : pctV >= 40 ? 'Em evolução' : 'Atenção'
                  : null
                const statusCls = pctV !== null
                  ? pctV >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : pctV >= 60 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : pctV >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                  :              'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                  : ''
                const barGrad = pctV !== null
                  ? pctV >= 80 ? 'from-emerald-500 to-green-500'
                  : pctV >= 60 ? 'from-amber-400 to-orange-400'
                  : pctV >= 40 ? 'from-blue-400 to-blue-500'
                  :              'from-red-400 to-red-500'
                  : 'from-slate-300 to-slate-400'
                const pctColor = pctV !== null
                  ? pctV >= 80 ? 'text-emerald-600 dark:text-emerald-400'
                  : pctV >= 60 ? 'text-amber-600 dark:text-amber-400'
                  : pctV >= 40 ? 'text-blue-600 dark:text-blue-400'
                  :              'text-red-500 dark:text-red-400'
                  : 'text-muted-foreground'
                const initials = v.nome.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
                const isFirst = i === 0

                return (
                  <div
                    key={v.vendedora_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isFirst
                        ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-800/30'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    {/* Position badge */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-none tabular-nums ${
                      RANK_STYLE[i] ?? 'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-none shadow-sm ${
                      AVATAR_BG[i] ?? 'bg-slate-400'
                    }`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + badge */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm truncate leading-tight ${isFirst ? 'font-bold' : 'font-semibold'}`}>{v.nome}</p>
                        {status && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-none whitespace-nowrap ${statusCls}`}>
                            {status}
                          </span>
                        )}
                      </div>
                      {/* Bar + pct */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barGrad}`}
                            style={{ width: `${pctV ?? (v.totalMes > 0 ? 12 : 0)}%` }}
                          />
                        </div>
                        {pctV !== null && (
                          <span className={`text-[10px] tabular-nums flex-none w-8 text-right font-semibold ${pctColor}`}>
                            {pctV}%
                          </span>
                        )}
                      </div>
                      {/* Value / meta · qty */}
                      <p className="text-[11px] text-muted-foreground tabular-nums leading-tight">
                        <span className="font-semibold text-foreground">{fmt(v.totalMes)}</span>
                        {v.meta && <span> / {fmt(v.meta)}</span>}
                        <span className="mx-1 opacity-40">·</span>
                        <span>{v.qtdMes} venda{v.qtdMes !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Team summary footer */}
            <div className="h-px bg-border/50" />
            <div className="rounded-xl bg-muted/30 px-4 py-3 grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Total equipe</p>
                <p className="text-xs font-bold tabular-nums text-foreground">{fmt(teamTotalMes)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Vendas</p>
                <p className="text-xs font-bold tabular-nums text-foreground">{teamTotalVendas}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Equipe</p>
                <p className="text-xs font-bold tabular-nums text-foreground">
                  {rankingMes.length} pessoa{rankingMes.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Melhor progresso</p>
                <p className={`text-xs font-bold tabular-nums ${teamBestPct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : teamBestPct > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {teamBestPct > 0 ? `${teamBestPct}%` : '—'}
                </p>
              </div>
            </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada este mês.</p>
              <Link href="/vendas/nova" className="text-xs text-primary hover:underline mt-1">
                Registrar primeira venda →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SEÇÃO 3 + 4 — RECOMPRAS / TOP PRODUTOS
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* — RECOMPRAS DOS PRÓXIMOS 7 DIAS — */}
        <div className="lg:col-span-7 rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40 flex items-center justify-center flex-none">
                <Bell className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-semibold">Recompras dos próximos 7 dias</h2>
            </div>
            <Link href="/avisos" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>

          {/* Atrasados — faixa de urgência */}
          {avisosPrazo.atrasados.qtd > 0 && (
            <Link
              href="/avisos"
              className="group flex items-center gap-3 rounded-xl border border-red-200/80 bg-gradient-to-r from-red-50 to-rose-50/50 dark:from-red-950/25 dark:to-rose-950/15 dark:border-red-800/40 px-4 py-3.5 hover:border-red-300 dark:hover:border-red-700 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-none">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-700 dark:text-red-400 leading-tight">
                  {avisosPrazo.atrasados.qtd} aviso{avisosPrazo.atrasados.qtd !== 1 ? 's' : ''} atrasado{avisosPrazo.atrasados.qtd !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                  {avisosPrazo.atrasados.valor > 0
                    ? `${fmt(avisosPrazo.atrasados.valor)} em potencial parado`
                    : 'Clientes aguardando contato da equipe'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-red-400 flex-none group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          {/* Cards por prazo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {prazoCards.map(({ label, data, cardCls, numCls, emptyNumCls, valueCls }) => (
              <Link
                key={label}
                href="/avisos"
                className={`group rounded-xl border px-4 py-4 flex flex-col gap-1 hover:shadow-md hover:opacity-90 active:scale-95 transition-all ${cardCls}`}
              >
                <p className={`text-3xl font-bold tabular-nums leading-none ${data.qtd > 0 ? numCls : emptyNumCls}`}>
                  {data.qtd}
                </p>
                <p className="text-xs font-medium text-muted-foreground leading-tight mt-1.5">{label}</p>
                {data.valor > 0 ? (
                  <p className={`text-xs font-semibold tabular-nums mt-0.5 ${valueCls}`}>
                    {fmt(data.valor)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground/35 mt-0.5">sem oportunidades</p>
                )}
              </Link>
            ))}
          </div>

          {/* Empty state */}
          {totalAvisosPendentes === 0 && avisosPrazo.atrasados.qtd === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-4 text-center rounded-xl bg-muted/20 border border-dashed">
              <Bell className="h-6 w-6 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Nenhuma recompra pendente no momento.</p>
            </div>
          )}

          {/* Micro orientação */}
          {(totalAvisosPendentes > 0 || avisosPrazo.atrasados.qtd > 0) && (
            <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
              Priorize os clientes com recompra vencendo para recuperar dinheiro parado.
            </p>
          )}

          {/* Rodapé de resumo */}
          <div className="h-px bg-border/50" />
          <div className="rounded-xl bg-muted/30 px-4 py-3 grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Atrasados</p>
              <p className={`text-xs font-bold tabular-nums ${avisosPrazo.atrasados.qtd > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                {avisosPrazo.atrasados.qtd > 0 ? avisosPrazo.atrasados.qtd : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Potencial parado</p>
              <p className={`text-xs font-bold tabular-nums ${avisosPrazo.atrasados.valor > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
                {avisosPrazo.atrasados.valor > 0 ? fmt(avisosPrazo.atrasados.valor) : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Próx. 7 dias</p>
              <p className={`text-xs font-bold tabular-nums ${potencial7DiasAvisos > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {fmt(potencial7DiasAvisos)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Prioridade</p>
              <p className={`text-xs font-bold ${
                prioridadeLabel === 'Atrasados' ? 'text-red-600 dark:text-red-400'
                : prioridadeLabel === 'Hoje' ? 'text-blue-600 dark:text-blue-400'
                : prioridadeLabel === 'Próx. dias' ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
              }`}>
                {prioridadeLabel}
              </p>
            </div>
          </div>
        </div>

        {/* — TOP PRODUTOS DO MÊS — */}
        <div className="lg:col-span-5 rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold">Top produtos do mês</h2>
            </div>
            <Link href="/produtos" className="text-xs text-primary hover:underline">
              Ver produtos →
            </Link>
          </div>

          {topProdutosMes.length > 0 ? (
            <>
              <div className="space-y-1">
                {topProdutosMes.map((p, i) => {
                  const isFirst = i === 0
                  const barGrad = isFirst
                    ? 'from-emerald-500 to-green-500'
                    : 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'

                  return (
                    <div
                      key={p.nome}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${
                        isFirst
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-100/80 dark:border-emerald-800/30'
                          : 'hover:bg-muted/40'
                      }`}
                    >
                      {/* Position */}
                      <span className={`text-[11px] font-bold tabular-nums flex-none w-4 text-center ${
                        isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'
                      }`}>
                        {i + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className={`w-9 h-9 rounded-xl overflow-hidden flex-none border ${
                        isFirst ? 'border-emerald-200 dark:border-emerald-800/40' : 'border-border/60'
                      }`}>
                        {p.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.foto_url}
                            alt={p.nome}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${
                            isFirst ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted/60'
                          }`}>
                            <Package className={`h-4 w-4 ${
                              isFirst ? 'text-emerald-600' : 'text-muted-foreground/30'
                            }`} />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + value */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className={`text-sm truncate leading-tight ${isFirst ? 'font-bold' : 'font-medium'}`}>
                            {p.nome}
                          </p>
                          <p className={`text-sm tabular-nums flex-none ${
                            isFirst ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-semibold'
                          }`}>
                            {fmt(p.total)}
                          </p>
                        </div>
                        {/* Bar + pct */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barGrad}`}
                              style={{ width: `${p.pct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] tabular-nums flex-none w-7 text-right font-semibold ${
                            isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {p.pct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer summary */}
              <div className="h-px bg-border/50" />
              <div className="rounded-xl bg-muted/30 px-4 py-3 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">
                    Top {topProdutosMes.length}
                  </p>
                  <p className="text-xs font-bold tabular-nums">
                    {fmt(topProdutosMes.reduce((s, prod) => s + prod.total, 0))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">
                    Líder
                  </p>
                  <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {topProdutosMes[0]?.pct ?? 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">
                    Produtos
                  </p>
                  <p className="text-xs font-bold tabular-nums">
                    {topProdutosMes.length}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center rounded-xl bg-muted/20 border border-dashed">
              <Package className="h-7 w-7 text-muted-foreground/25" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Nenhum produto vendido este mês ainda.</p>
              </div>
              <Link href="/vendas/nova" className="text-xs text-primary hover:underline">
                Registrar nova venda →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ATALHOS INFERIORES
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/avisos"
          className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/25 border border-amber-100 dark:border-amber-800/30 flex items-center justify-center flex-none">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Fila de avisos</p>
            <p className="text-xs text-muted-foreground">Acompanhar envios</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-none" />
        </Link>
        <Link
          href="/vendas"
          className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/25 border border-blue-100 dark:border-blue-800/30 flex items-center justify-center flex-none">
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Extrato de vendas</p>
            <p className="text-xs text-muted-foreground">Todas as vendas</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-none" />
        </Link>
        <Link
          href="/configuracoes/equipe"
          className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center flex-none">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Gestão da equipe</p>
            <p className="text-xs text-muted-foreground">Ver vendedoras</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-none" />
        </Link>
      </div>
    </div>
  )
}
