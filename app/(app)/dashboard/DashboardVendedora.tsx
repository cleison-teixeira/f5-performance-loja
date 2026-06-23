'use client'

import Link from 'next/link'
import {
  Bell, AlertCircle,
  RefreshCw, Send, ChevronRight, Clock, Package,
} from 'lucide-react'

import type { DashboardAviso, FunilStep, ListaEsperaInfo, ProdutoTopMes, DinheiroMesaInfo, TopProdutoRecompra } from './page'
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
  nomeVendedora: string
  avisosAtrasados: DashboardAviso[]
  avisosHoje: DashboardAviso[]
  listaEsperaInfo: ListaEsperaInfo
  avisosEnviadosCount: number
  topProdutosMes: ProdutoTopMes[]
  totalRecomprasValorMes: number
  qtdRecomprasMes: number
  dinheiroMesaInfo: DinheiroMesaInfo
  topProdutosRecompra: TopProdutoRecompra[]
}

const TIPO_LABEL: Record<string, string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
}

const TIPO_COR: Record<string, string> = {
  agradecimento: 'bg-blue-100 text-blue-700',
  relacionamento: 'bg-amber-100 text-amber-700',
  recompra: 'bg-green-100 text-green-700',
  oferta: 'bg-purple-100 text-purple-700',
}


export function DashboardVendedora({
  loja,
  nomeVendedora,
  avisosAtrasados,
  avisosHoje,
  listaEsperaInfo,
  avisosEnviadosCount,
  topProdutosMes,
  totalRecomprasValorMes,
  qtdRecomprasMes,
  dinheiroMesaInfo,
  topProdutosRecompra,
}: Props) {
  const firstName = nomeVendedora.split(' ')[0]
  const totalAtrasados = avisosAtrasados.length
  const totalHoje = avisosHoje.length

  return (
    <div className="space-y-5 pb-10">

      {/* ══ 1. SAUDAÇÃO ══ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {firstName}</p>
          <h1 className="text-xl font-semibold tracking-tight">Seu painel de recompra</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{loja.nome} · Clientes para retornar, recompras em aberto e dinheiro na mesa.</p>
        </div>
        <span className="inline-block text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex-none mt-1">
          Vendedor(a)
        </span>
      </div>

      {/* ══ 2. DINHEIRO NA MESA ══ */}
      <DinheiroNaMesaHero
        badge={(totalAtrasados + totalHoje) > 0
          ? `${totalAtrasados + totalHoje} aviso${totalAtrasados + totalHoje !== 1 ? 's' : ''} na fila`
          : undefined}
        valorPrincipal={fmt(dinheiroMesaInfo.totalPotencial)}
        isEmpty={dinheiroMesaInfo.totalPotencial === 0}
        zeroStateText="Registre uma venda para começar a gerar recompras."
        subtexto="em recompras abertas na sua fila"
        ind1Label="Recompras este mês"
        ind1Valor={fmt(totalRecomprasValorMes)}
        ind2Label="Oportunidades"
        ind2Valor={String(totalHoje)}
        ind3Label="Próx. 7 dias"
        ind3Valor={fmt(dinheiroMesaInfo.potencial7Dias)}
        ctaLabel="Ver meus avisos"
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
          totalHoje > 0
            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40'
            : 'bg-card'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
              totalHoje > 0 ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-muted/60'
            }`}>
              <Clock className={`h-3.5 w-3.5 ${totalHoje > 0 ? 'text-blue-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Para hoje</p>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${totalHoje > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
            {totalHoje}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">a acionar hoje</p>
        </div>

        {/* Atrasados */}
        <div className={`rounded-xl border shadow-sm p-4 ${
          totalAtrasados > 0
            ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40'
            : 'bg-card'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
              totalAtrasados > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-muted/60'
            }`}>
              <AlertCircle className={`h-3.5 w-3.5 ${totalAtrasados > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">Atrasados</p>
          </div>
          <p className={`text-xl font-bold tabular-nums tracking-tight ${totalAtrasados > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
            {totalAtrasados}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalAtrasados > 0 ? 'atenção necessária' : 'em dia'}
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

      {/* ══ 5. LISTA DE ESPERA ══ */}
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

      {/* ══ 6. TOP PRODUTOS DA LOJA ══ */}
      <div className="rounded-2xl border bg-card shadow-sm p-5 flex flex-col gap-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center flex-none">
              <Package className="h-4 w-4 text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold">Top produtos da loja</h2>
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
                const barGradP = isFirst
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
                          {fmt(p.total)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${barGradP}`}
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
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Líder</p>
                <p className="text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {topProdutosMes[0]?.pct ?? 0}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.08em] leading-none mb-1.5">Produtos</p>
                <p className="text-xs font-bold tabular-nums">{topProdutosMes.length}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center rounded-xl bg-muted/20 border border-dashed">
            <Package className="h-7 w-7 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground font-medium">Nenhum produto vendido este mês ainda.</p>
            <Link href="/vendas/nova" className="text-xs text-primary hover:underline">
              Registrar nova venda →
            </Link>
          </div>
        )}
      </div>

      {/* ══ AVISOS ATRASADOS ══ */}
      {avisosAtrasados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Atrasados — envie agora
            </p>
            <Link href="/avisos" className="text-xs text-muted-foreground hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {avisosAtrasados.map(a => (
              <AvisoEnvio key={a.id} aviso={a} urgente />
            ))}
          </div>
        </div>
      )}

      {/* ══ AVISOS DE HOJE ══ */}
      {avisosHoje.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              Para hoje
            </p>
            <Link href="/avisos" className="text-xs text-muted-foreground hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {avisosHoje.map(a => (
              <AvisoEnvio key={a.id} aviso={a} />
            ))}
          </div>
        </div>
      )}

      {/* ══ SEM AVISOS PENDENTES ══ */}
      {avisosAtrasados.length === 0 && avisosHoje.length === 0 && (
        <div className="rounded-2xl border bg-card p-6 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <p className="font-semibold text-sm">Fila zerada!</p>
          <p className="text-xs text-muted-foreground">Você está em dia com todos os clientes.</p>
          <Link href="/avisos" className="text-xs text-primary hover:underline block mt-2">
            Ver histórico de avisos →
          </Link>
        </div>
      )}

      {/* ══ CTAs ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/vendas/nova"
          className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 flex items-center justify-between gap-3 shadow-md hover:shadow-lg transition-shadow"
        >
          <div>
            <p className="font-bold text-base">Registrar compra para recompra</p>
            <p className="text-sm text-white/80 mt-0.5">Gera avisos automáticos de recompra.</p>
          </div>
          <ChevronRight className="h-6 w-6 flex-none text-white/60" />
        </Link>
        <Link
          href="/avisos"
          className="rounded-2xl border bg-card p-5 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="font-bold text-base">Abrir Fila de Recompra</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalAtrasados + totalHoje > 0
                ? `${totalAtrasados + totalHoje} aviso${totalAtrasados + totalHoje !== 1 ? 's' : ''} pendente${totalAtrasados + totalHoje !== 1 ? 's' : ''}`
                : 'Fila de mensagens para clientes'}
            </p>
          </div>
          <ChevronRight className="h-6 w-6 flex-none text-muted-foreground" />
        </Link>
      </div>
    </div>
  )
}

function AvisoEnvio({ aviso, urgente }: { aviso: DashboardAviso; urgente?: boolean }) {
  const numero = aviso.cliente_whatsapp.replace(/\D/g, '')
  const waLink = `https://wa.me/55${numero}?text=${encodeURIComponent(aviso.texto_renderizado)}`

  return (
    <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${
      urgente ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold truncate">{aviso.cliente_nome}</p>
          <span className={`inline-flex flex-none items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            TIPO_COR[aviso.tipo] ?? 'bg-gray-100 text-gray-600'
          }`}>
            {TIPO_LABEL[aviso.tipo] ?? aviso.tipo}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{aviso.produto_nome}</p>
        {urgente && (
          <div className="flex items-center gap-1 mt-1.5">
            <AlertCircle className="h-3 w-3 text-red-500 flex-none" />
            <p className="text-xs text-red-600">
              Previsto para {new Date(aviso.data_aviso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </p>
          </div>
        )}
      </div>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-none rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-bold px-4 py-2.5 transition-colors shadow-sm"
      >
        Enviar
      </a>
    </div>
  )
}
