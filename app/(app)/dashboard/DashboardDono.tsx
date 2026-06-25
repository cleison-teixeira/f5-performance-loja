'use client'

import Link from 'next/link'
import {
  ChevronRight, Package, Bell, TrendingUp, AlertCircle,
  RefreshCw, Clock, Send,
} from 'lucide-react'
import type { VendedoraRankingMeta, DinheiroMesaInfo, AvisosPrazoInfo, ProdutoTopMes, ListaEsperaInfo, RankingRecomprasItem, TopProdutoRecompra, RankingLojasItem } from './page'
import { ProdutoEmFocoCard } from './ProdutoEmFocoCard'
import { DinheiroNaMesaHero } from './DinheiroNaMesaHero'

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
  metaVendasMes: number | null
  diasRestantes: number
  rankingMes: VendedoraRankingMeta[]
  avisosPrazo: AvisosPrazoInfo
  topProdutosMes: ProdutoTopMes[]
  vendasDiariaMes: number[]
  diasMes: string[]
  hojeDia: number
  mesLabel: string
  totalRecomprasValor: number
  qtdRecompras: number
  totalComissoes: number
  avisosEnviadosCount: number
  rankingRecompras: RankingRecomprasItem[]
  topProdutosRecompra: TopProdutoRecompra[]
  totalRecomprasValorMes: number
  qtdRecomprasMes: number
  rankingLojas: RankingLojasItem[]
}

const AVATAR_BG = ['bg-amber-500', 'bg-slate-400', 'bg-orange-400', 'bg-blue-400', 'bg-violet-400']
const RANK_STYLE = [
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
  'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
]


export function DashboardDono({
  loja,
  nomeUsuario,
  listaEsperaInfo,
  dinheiroMesaInfo,
  avisosPrazo,
  rankingMes,
  avisosEnviadosCount,
  rankingRecompras,
  topProdutosRecompra,
  totalRecomprasValorMes,
  qtdRecomprasMes,
  rankingLojas,
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
        <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex-none mt-1">
          Multi-loja
        </span>
      </div>

      {/* ══ 2. DINHEIRO NA MESA ══ */}
      <DinheiroNaMesaHero
        badge={qtdOportunidades > 0
          ? `${qtdOportunidades} oportunidade${qtdOportunidades !== 1 ? 's' : ''} abertas`
          : undefined}
        valorPrincipal={fmt(totalPotencial)}
        isEmpty={totalPotencial === 0}
        zeroStateText="Registre vendas para gerar oportunidades de recompra."
        subtexto="em recompras no radar nos próximos 90 dias"
        ind1Label="Oportunidades"
        ind1Valor={String(qtdOportunidades)}
        ind2Label="Próx. 7 dias"
        ind2Valor={fmt(potencial7Dias)}
        ind3Label="Clientes vencendo"
        ind3Valor={String(qtdClientes7Dias)}
        ctaLabel="Ver fila de recompra"
        ctaHref="/avisos"
      />

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
          avisosPrazo.hoje.qtd > 0
            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40'
            : 'bg-card'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
              avisosPrazo.hoje.qtd > 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-muted/60'
            }`}>
              <Clock className={`h-3.5 w-3.5 ${avisosPrazo.hoje.qtd > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Para hoje</p>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${avisosPrazo.hoje.qtd > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
            {avisosPrazo.hoje.qtd}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">a acionar hoje</p>
        </div>

        {/* Atrasados */}
        <div className={`rounded-xl border shadow-sm p-4 ${
          avisosPrazo.atrasados.qtd > 0
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40'
            : 'bg-card'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
              avisosPrazo.atrasados.qtd > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted/60'
            }`}>
              <AlertCircle className={`h-3.5 w-3.5 ${avisosPrazo.atrasados.qtd > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Atrasados</p>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${avisosPrazo.atrasados.qtd > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {avisosPrazo.atrasados.qtd}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {avisosPrazo.atrasados.qtd > 0 ? 'atenção necessária' : 'em dia'}
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

      {/* ══ 4. LISTA DE ESPERA (card robusto) ══ */}
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

      {/* ══ 7. PERFORMANCE DAS LOJAS ══ */}
      <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-none">Performance das lojas</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Dinheiro recuperado e oportunidades em aberto por unidade</p>
          </div>
        </div>

        <div className="space-y-1">
          {rankingLojas.map((item, i) => {
            const isFirst = i === 0
            const maxVal = rankingLojas[0]?.valorRecuperadoMes ?? 1
            const pct = maxVal > 0 ? Math.round((item.valorRecuperadoMes / maxVal) * 100) : 0
            const barGrad = isFirst
              ? 'from-emerald-500 to-green-500'
              : 'from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500'
            return (
              <div
                key={item.lojaId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className={`text-sm truncate leading-tight ${isFirst ? 'font-bold' : 'font-medium'}`}>
                      {item.lojaNome}
                    </p>
                    <p className={`text-sm tabular-nums flex-none ${
                      isFirst ? 'font-bold text-emerald-700 dark:text-emerald-400' : 'font-semibold'
                    }`}>
                      {fmt(item.valorRecuperadoMes)}
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
                  <p className="text-[10px] text-muted-foreground">
                    {item.qtdOportunidades} oportunidade{item.qtdOportunidades !== 1 ? 's' : ''} na fila · {item.qtdRecomprasMes} recompra{item.qtdRecomprasMes !== 1 ? 's' : ''} este mês
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
            <p className="text-xs font-bold tabular-nums">
              {fmt(rankingLojas.reduce((s, r) => s + r.valorRecuperadoMes, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Líder</p>
            <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmt(rankingLojas[0]?.valorRecuperadoMes ?? 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Unidades</p>
            <p className="text-xs font-bold tabular-nums">{rankingLojas.length}</p>
          </div>
        </div>
      </div>

      {/* ══ 8. CTAs ══ */}
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
