'use client'

import Link from 'next/link'
import {
  ChevronRight, Package, Bell, TrendingUp, AlertCircle,
  RefreshCw, Clock, Send, DollarSign,
} from 'lucide-react'
import type { VendedoraRankingMeta, DinheiroMesaInfo, ProdutoTopMes, ListaEsperaInfo, RankingRecomprasItem, TopProdutoRecompra } from './page'
import { ProdutoEmFocoCard } from './ProdutoEmFocoCard'

function fmtVal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

interface Props {
  loja: { id: string; nome: string }
  nomeUsuario: string
  listaEsperaInfo: ListaEsperaInfo
  dinheiroMesaInfo: DinheiroMesaInfo
  totalVendasMes: number
  diasRestantes: number
  rankingMes: VendedoraRankingMeta[]
  topProdutosMes: ProdutoTopMes[]
  totalRecomprasValor: number
  qtdRecompras: number
  totalComissoes: number
  qtdAvisosAtrasados: number
  qtdAvisosHoje: number
  avisosEnviadosCount: number
  rankingRecompras: RankingRecomprasItem[]
  topProdutosRecompra: TopProdutoRecompra[]
  totalRecomprasValorMes: number
  qtdRecomprasMes: number
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
        <linearGradient id="gm-n1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="gm-n2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="gm-n3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <radialGradient id="gm-ca" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <radialGradient id="gm-cb" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="55%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <rect x="14" y="16" width="120" height="72" rx="9"
        fill="url(#gm-n1)" opacity="0.70" transform="rotate(-15 74 52)" />
      <rect x="14" y="16" width="120" height="72" rx="9"
        fill="url(#gm-n2)" opacity="0.86" transform="rotate(-6 74 52)" />
      <rect x="20" y="22" width="108" height="60" rx="6"
        fill="none" stroke="#34d399" strokeWidth="0.7" opacity="0.3" transform="rotate(-6 74 52)" />
      <rect x="14" y="16" width="120" height="72" rx="9" fill="url(#gm-n3)" />
      <rect x="20" y="22" width="108" height="60" rx="6"
        fill="none" stroke="#a7f3d0" strokeWidth="0.8" opacity="0.45" />
      <circle cx="40" cy="52" r="14" fill="#059669" />
      <circle cx="40" cy="52" r="10" fill="none" stroke="#6ee7b7" strokeWidth="0.7" opacity="0.45" />
      <line x1="62" y1="33" x2="116" y2="33" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="41" x2="116" y2="41" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="49" x2="116" y2="49" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="57" x2="110" y2="57" stroke="#a7f3d0" strokeWidth="1" opacity="0.4" />
      <line x1="62" y1="65" x2="98" y2="65" stroke="#a7f3d0" strokeWidth="0.9" opacity="0.35" />
      <rect x="20" y="20" width="13" height="8" rx="2" fill="#047857" opacity="0.65" />
      <rect x="115" y="60" width="13" height="8" rx="2" fill="#047857" opacity="0.65" />
      <circle cx="106" cy="120" r="16" fill="url(#gm-cb)" opacity="0.82" />
      <circle cx="106" cy="120" r="16" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.45" />
      <circle cx="102" cy="116" r="7" fill="white" opacity="0.07" />
      <circle cx="150" cy="106" r="12" fill="url(#gm-cb)" opacity="0.88" />
      <circle cx="150" cy="106" r="12" fill="none" stroke="#f59e0b" strokeWidth="0.7" opacity="0.5" />
      <circle cx="147" cy="103" r="5" fill="white" opacity="0.09" />
      <circle cx="126" cy="112" r="21" fill="url(#gm-ca)" />
      <circle cx="126" cy="112" r="21" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.6" />
      <circle cx="121" cy="107" r="9" fill="white" opacity="0.10" />
    </svg>
  )
}

export function DashboardGerente({
  loja,
  nomeUsuario,
  listaEsperaInfo,
  dinheiroMesaInfo,
  qtdAvisosAtrasados,
  qtdAvisosHoje,
  avisosEnviadosCount,
  rankingRecompras,
  topProdutosRecompra,
  totalRecomprasValorMes,
  qtdRecomprasMes,
}: Props) {
  const { totalPotencial, qtdOportunidades, potencial7Dias, qtdClientes7Dias } = dinheiroMesaInfo

  return (
    <div className="space-y-5 pb-10">

      {/* ══ 1. SAUDAÇÃO ══ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {nomeUsuario.split(' ')[0]}</p>
          <h1 className="text-xl font-semibold tracking-tight">Painel de recompra</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{loja.nome} · Dinheiro na mesa, recompras em aberto e fila da equipe.</p>
        </div>
        <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 flex-none mt-1">
          Gerente
        </span>
      </div>

      {/* ══ 2. DINHEIRO NA MESA ══ */}
      <div className="relative rounded-2xl overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-[#0d4a2e] to-[#081f14]" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-green-600/10 blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 -left-10 w-36 h-36 rounded-full bg-emerald-400/8 blur-2xl pointer-events-none" />

        <div className="relative p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-none">
                <DollarSign className="h-4 w-4 text-emerald-300" />
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

          <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-10">
            <div className="flex-1 flex flex-col gap-5">
              <div>
                <p className="text-5xl md:text-6xl font-bold tabular-nums text-white leading-none tracking-tight">
                  {fmt(totalPotencial)}
                </p>
                <p className="text-sm text-emerald-300/70 mt-2.5 font-medium">
                  em recompras abertas e oportunidades na fila
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
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">Oportunidades</p>
                  <p className="text-2xl font-bold text-white tabular-nums">{qtdOportunidades}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">Próx. 7 dias</p>
                  <p className="text-2xl font-bold text-white tabular-nums">{fmt(potencial7Dias)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">Clientes vencendo</p>
                  <p className="text-2xl font-bold text-white tabular-nums">{qtdClientes7Dias}</p>
                </div>
              </div>

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

      {/* ══ 2.5. PRODUTO EM FOCO ══ */}
      {topProdutosRecompra.length > 0 && (
        <ProdutoEmFocoCard produto={topProdutosRecompra[0]} />
      )}

      {/* ══ 3. QUATRO CARDS RECOMPRA-FIRST ══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {/* Recuperado no mês */}
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-none">
              <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Recuperado</p>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight">{fmt(totalRecomprasValorMes)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{qtdRecomprasMes} recompra{qtdRecomprasMes !== 1 ? 's' : ''} este mês</p>
        </div>

        {/* Para hoje */}
        <div className={`rounded-xl border shadow-sm p-4 ${
          qtdAvisosHoje > 0
            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40'
            : 'bg-card'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
              qtdAvisosHoje > 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-muted/60'
            }`}>
              <Clock className={`h-3.5 w-3.5 ${qtdAvisosHoje > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Para hoje</p>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${qtdAvisosHoje > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
            {qtdAvisosHoje}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">a acionar hoje</p>
        </div>

        {/* Atrasados */}
        <div className={`rounded-xl border shadow-sm p-4 ${
          qtdAvisosAtrasados > 0
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40'
            : 'bg-card'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
              qtdAvisosAtrasados > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted/60'
            }`}>
              <AlertCircle className={`h-3.5 w-3.5 ${qtdAvisosAtrasados > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Atrasados</p>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${qtdAvisosAtrasados > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {qtdAvisosAtrasados}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {qtdAvisosAtrasados > 0 ? 'atenção necessária' : 'em dia'}
          </p>
        </div>

        {/* Enviados */}
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center flex-none">
              <Send className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Enviados</p>
          </div>
          <p className="text-xl font-bold tabular-nums tracking-tight">{avisosEnviadosCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">30 dias</p>
        </div>
      </div>

      {/* ══ 4. LISTA DE ESPERA ══ */}
      {listaEsperaInfo.qtdAguardando > 0 && (
        <div className="rounded-2xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-none shadow-sm">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                  Lista de espera
                </p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-0.5 tabular-nums">
                  {fmtVal(listaEsperaInfo.valorPotencial)}
                </p>
              </div>
            </div>
            <Link
              href="/lista-espera"
              className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex-none mt-1"
            >
              Ver lista <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
            em demanda aguardando reposição
          </p>
          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">
            {listaEsperaInfo.qtdAguardando} item{listaEsperaInfo.qtdAguardando !== 1 ? 's' : ''}{' '}
            · {listaEsperaInfo.qtdClientes} cliente{listaEsperaInfo.qtdClientes !== 1 ? 's' : ''} interessado{listaEsperaInfo.qtdClientes !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* ══ 5. RANKING DE RECUPERAÇÃO (full width) ══ */}
      <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">Ranking de recuperação</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recuperado por vendedora este mês</p>
            </div>
          </div>
          <Link href="/configuracoes/equipe" className="text-xs text-primary hover:underline">
            Ver equipe →
          </Link>
        </div>

        {rankingRecompras.length > 0 ? (
          <>
            <div className="space-y-1">
              {rankingRecompras.slice(0, 5).map((v, i) => {
                const initials = v.nome.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
                const isFirst = i === 0
                const maxVal = rankingRecompras[0]?.valorRecuperado ?? 1
                const pct = maxVal > 0 ? Math.round((v.valorRecuperado / maxVal) * 100) : 0
                const barGrad = isFirst
                  ? 'from-emerald-500 to-green-500'
                  : 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'
                return (
                  <div
                    key={v.vendedora_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isFirst
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-800/30'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-none tabular-nums ${
                      RANK_STYLE[i] ?? 'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-none shadow-sm ${
                      AVATAR_BG[i] ?? 'bg-slate-400'
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm truncate leading-tight ${isFirst ? 'font-bold' : 'font-semibold'}`}>{v.nome}</p>
                        <p className={`text-sm tabular-nums flex-none ${isFirst ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-semibold'}`}>
                          {fmt(v.valorRecuperado)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barGrad}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] tabular-nums flex-none w-7 text-right font-semibold ${
                          isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                        }`}>
                          {pct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground tabular-nums leading-tight">
                        {v.qtd} recompra{v.qtd !== 1 ? 's' : ''} confirmada{v.qtd !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="h-px bg-border/50" />
            <div className="rounded-xl bg-muted/30 px-4 py-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Recuperado</p>
                <p className="text-xs font-bold tabular-nums text-foreground">{fmt(rankingRecompras.reduce((s, v) => s + v.valorRecuperado, 0))}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Recompras</p>
                <p className="text-xs font-bold tabular-nums text-foreground">{rankingRecompras.reduce((s, v) => s + v.qtd, 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Equipe</p>
                <p className="text-xs font-bold tabular-nums text-foreground">
                  {rankingRecompras.length} pessoa{rankingRecompras.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <RefreshCw className="h-8 w-8 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">Nenhuma recompra confirmada este mês.</p>
            <Link href="/avisos" className="text-xs text-primary hover:underline mt-1">
              Ir para a fila de recompra →
            </Link>
          </div>
        )}
      </div>

      {/* ══ 6. PRODUTOS COM MAIS OPORTUNIDADES (full width) ══ */}
      <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold">Top produtos de recompra</h2>
          </div>
          <Link href="/produtos" className="text-xs text-primary hover:underline">
            Ver produtos →
          </Link>
        </div>

        {topProdutosRecompra.length > 0 ? (
          <>
            <div className="space-y-1">
              {topProdutosRecompra.map((p, i) => {
                const isFirst = i === 0
                const pct = Math.round((p.qtd / topProdutosRecompra[0].qtd) * 100)
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
                    <span className={`text-[11px] font-bold tabular-nums flex-none w-4 text-center ${
                      isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/40'
                    }`}>
                      {i + 1}
                    </span>
                    <div className={`w-9 h-9 rounded-xl overflow-hidden flex-none border ${
                      isFirst ? 'border-emerald-200 dark:border-emerald-800/40' : 'border-border/60'
                    }`}>
                      {p.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          isFirst ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted/60'
                        }`}>
                          <Package className={`h-4 w-4 ${isFirst ? 'text-emerald-600' : 'text-muted-foreground/30'}`} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm truncate leading-tight ${isFirst ? 'font-bold' : 'font-medium'}`}>
                          {p.nome}
                        </p>
                        <p className={`text-sm tabular-nums flex-none ${
                          isFirst ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-semibold'
                        }`}>
                          {p.qtd} aviso{p.qtd !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barGrad}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[10px] tabular-nums flex-none w-7 text-right font-semibold ${
                          isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                        }`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="h-px bg-border/50" />
            <div className="rounded-xl bg-muted/30 px-4 py-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">
                  Total na fila
                </p>
                <p className="text-xs font-bold tabular-nums">
                  {topProdutosRecompra.reduce((s, prod) => s + prod.qtd, 0)} avisos
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Líder</p>
                <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {topProdutosRecompra[0]?.qtd ?? 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Produtos</p>
                <p className="text-xs font-bold tabular-nums">{topProdutosRecompra.length}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center rounded-xl bg-muted/20 border border-dashed">
            <Package className="h-7 w-7 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum produto com oportunidades na fila.</p>
            <Link href="/vendas/nova" className="text-xs text-primary hover:underline">
              Registrar uma venda →
            </Link>
          </div>
        )}
      </div>

      {/* ══ 7. CTAs ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/avisos"
          className="rounded-xl border bg-card shadow-sm p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center flex-none">
            <Bell className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Ir para Fila de Recompra</p>
            <p className="text-xs text-muted-foreground">Acompanhar e acionar clientes</p>
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
            <p className="text-xs text-muted-foreground">Ver vendedoras e resultados</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-none" />
        </Link>
      </div>
    </div>
  )
}
