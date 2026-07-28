'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, Package2, Users, Target, TrendingUp,
  ShoppingCart, Info, BarChart3, Trophy, Pencil, Wallet,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { atualizarStatusCampanha, marcarComoPago, resolverRevisaoApuracao } from '../actions'
import type { CampanhaVenda, ResultadoCampanha, StatusCampanha, Apuracao, StatusApuracao } from '../types'
import { TIPO_LABELS, STATUS_LABELS, STATUS_CORES, UNIDADE_LABELS } from '../types'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function fmtData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function pct(valor: number, meta: number): number {
  if (!meta) return 0
  return Math.min(Math.round((valor / meta) * 100), 999)
}

function BarraProgresso({ valor, meta, cor = 'bg-primary' }: { valor: number; meta: number; cor?: string }) {
  const p = meta > 0 ? Math.min((valor / meta) * 100, 100) : 0
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${p}%` }} />
    </div>
  )
}

const APURACAO_STATUS_INFO: Record<StatusApuracao, { label: string; cls: string }> = {
  pendente:    { label: 'Pendente',    cls: 'bg-amber-100 text-amber-700' },
  aprovado:    { label: 'Aprovado',    cls: 'bg-blue-100 text-blue-700' },
  pago:        { label: 'Pago',        cls: 'bg-emerald-100 text-emerald-700' },
  cancelado:   { label: 'Cancelado',   cls: 'bg-zinc-100 text-zinc-500' },
  em_revisao:  { label: 'Em revisão',  cls: 'bg-orange-100 text-orange-700' },
}

// ── Aba Financeiro ────────────────────────────────────────────────────────────

function AbaFinanceiro({
  apuracoes, campanhaId, lojaId, onRefresh,
}: {
  apuracoes: Apuracao[]
  campanhaId: string
  lojaId: string
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()

  function handlePagar(ap: Apuracao) {
    const valor = prompt(`Valor pago para ${ap.vendedora_nome} (R$):`, ap.valor_apurado.toFixed(2))
    if (valor == null) return
    const forma = prompt('Forma de pagamento (ex: pix, dinheiro):', 'pix')
    if (forma == null) return
    const data = new Date().toISOString().slice(0, 10)
    startTransition(async () => {
      const res = await marcarComoPago({
        apuracaoId: ap.id,
        campanhaId,
        lojaId,
        valorPago: parseFloat(valor.replace(',', '.')),
        formaPagamento: forma,
        dataPagamento: data,
      })
      if (res.ok) onRefresh()
      else alert(res.error)
    })
  }

  function handleResolverRevisao(ap: Apuracao, acao: 'aprovar' | 'estornar') {
    const obs = prompt(`Observação (opcional):`, '')
    if (obs == null) return
    startTransition(async () => {
      const res = await resolverRevisaoApuracao({
        apuracaoId: ap.id,
        lojaId,
        acao,
        observacao: obs || undefined,
      })
      if (res.ok) onRefresh()
      else alert(res.error)
    })
  }

  if (apuracoes.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        Nenhuma apuração registrada ainda. Apurações aparecem após o processamento de vendas.
      </div>
    )
  }

  const total = apuracoes.reduce((s, a) => s + (a.valor_pago ?? a.valor_apurado ?? 0), 0)
  const emRevisao = apuracoes.filter(a => a.status === 'em_revisao')

  return (
    <div className="space-y-3">
      {emRevisao.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:bg-orange-950/20 dark:border-orange-800 dark:text-orange-300">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{emRevisao.length} apuração(ões) em revisão por cancelamento pós-pagamento.</span>
        </div>
      )}

      {apuracoes.map(ap => {
        const info = APURACAO_STATUS_INFO[ap.status]
        return (
          <div key={ap.id} className="rounded-xl border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{ap.vendedora_nome}</p>
              <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${info.cls}`}>
                {info.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <p className="text-[10px] uppercase tracking-wide">Qtd apurada</p>
                <p className="font-semibold text-foreground">{ap.quantidade_apurada}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide">Comissão</p>
                <p className="font-semibold text-foreground">{fmtBRL(ap.valor_apurado)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide">Pago</p>
                <p className={`font-semibold ${ap.valor_pago != null ? 'text-emerald-600' : 'text-foreground'}`}>
                  {ap.valor_pago != null ? fmtBRL(ap.valor_pago) : '—'}
                </p>
              </div>
            </div>
            {ap.periodo_referencia && (
              <p className="text-[10px] text-muted-foreground">
                Período: {fmtData(ap.periodo_referencia)} · {ap.periodicidade === 'diaria' ? 'Diária' : 'Total'}
              </p>
            )}
            {ap.observacao && (
              <p className="text-[10px] text-muted-foreground italic">{ap.observacao}</p>
            )}
            {ap.status === 'aprovado' && (
              <button
                onClick={() => handlePagar(ap)}
                disabled={isPending}
                className="mt-1 flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marcar como pago
              </button>
            )}
            {ap.status === 'em_revisao' && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => handleResolverRevisao(ap, 'aprovar')}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Manter pago
                </button>
                <button
                  onClick={() => handleResolverRevisao(ap, 'estornar')}
                  disabled={isPending}
                  className="flex items-center gap-1 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Estornar
                </button>
              </div>
            )}
          </div>
        )
      })}

      <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">Total da campanha</span>
        <span className="font-bold">{fmtBRL(total)}</span>
      </div>
    </div>
  )
}

interface Props {
  campanha: CampanhaVenda
  resultado: ResultadoCampanha
  apuracoes: Apuracao[]
  lojaId: string
  podeGerenciar: boolean
}

const TABS_GESTOR = ['Resultado', 'Produtos', 'Equipe', 'Financeiro', 'Informações'] as const
const TABS_MEMBRO = ['Resultado', 'Produtos', 'Equipe', 'Informações'] as const
type Tab = 'Resultado' | 'Produtos' | 'Equipe' | 'Financeiro' | 'Informações'

export function CampanhaDetalheClient({ campanha, resultado, apuracoes, lojaId, podeGerenciar }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('Resultado')
  const [isPending, startTransition] = useTransition()
  const TABS = podeGerenciar ? TABS_GESTOR : TABS_MEMBRO

  const itensAtivos = campanha.itens.filter(i => i.ativo)
  const participantesAtivos = campanha.participantes.filter(p => p.ativo)
  const metaLoja = campanha.meta_loja
  const metaIndividual = campanha.meta_individual
  const unidade = campanha.unidade_meta
  const isDiaria = campanha.periodicidade === 'diaria'

  function handleStatusChange(novoStatus: StatusCampanha) {
    startTransition(async () => {
      const res = await atualizarStatusCampanha(campanha.id, lojaId, novoStatus)
      if (res.ok) router.refresh()
      else alert(res.error)
    })
  }

  const pctLoja = metaLoja ? pct(isDiaria ? resultado.unidades_hoje : resultado.total_unidades, metaLoja) : null
  const vendaLinkQuery = itensAtivos.length === 1
    ? `?produto_id=${itensAtivos[0].produto_id}&campanha_id=${campanha.id}&campanha_item_id=${itensAtivos[0].id}`
    : `?campanha_id=${campanha.id}`

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Link href="/campanhas" className="p-1.5 rounded-lg hover:bg-accent mt-0.5">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CORES[campanha.status]}`}>
              {STATUS_LABELS[campanha.status]}
            </span>
            <span className="text-[10px] text-muted-foreground">{TIPO_LABELS[campanha.tipo]}</span>
          </div>
          <h1 className="text-lg font-semibold mt-0.5">{campanha.nome}</h1>
          <p className="text-xs text-muted-foreground">
            {fmtData(campanha.data_inicio)} → {fmtData(campanha.data_fim)}
            {' · '}{itensAtivos.length} produto{itensAtivos.length !== 1 ? 's' : ''}
            {' · '}{participantesAtivos.length} participante{participantesAtivos.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Ações rápidas */}
      {campanha.status === 'ativa' && (
        <Link
          href={`/vendas/nova${vendaLinkQuery}`}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
          Registrar venda da campanha
        </Link>
      )}

      {/* Controles de status para gestores */}
      {podeGerenciar && (
        <div className="flex gap-2 flex-wrap">
          {['rascunho', 'programada', 'ativa', 'pausada'].includes(campanha.status) && (
            <Link
              href={`/campanhas/${campanha.id}/editar`}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Editar campanha
            </Link>
          )}
        </div>
      )}
      {podeGerenciar && (
        <div className="flex gap-2 flex-wrap">
          {campanha.status === 'rascunho' && (
            <button
              onClick={() => handleStatusChange('ativa')}
              disabled={isPending}
              className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Ativar campanha
            </button>
          )}
          {campanha.status === 'ativa' && (
            <>
              <button
                onClick={() => handleStatusChange('pausada')}
                disabled={isPending}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                Pausar
              </button>
              <button
                onClick={() => handleStatusChange('encerrada')}
                disabled={isPending}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                Encerrar
              </button>
            </>
          )}
          {campanha.status === 'pausada' && (
            <button
              onClick={() => handleStatusChange('ativa')}
              disabled={isPending}
              className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              Reativar
            </button>
          )}
          {['rascunho', 'ativa', 'pausada', 'programada'].includes(campanha.status) && (
            <button
              onClick={() => handleStatusChange('cancelada')}
              disabled={isPending}
              className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 ml-auto"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ─── Tab Resultado ──────────────────────────────────────────────────── */}
      {tab === 'Resultado' && (
        <div className="space-y-4">
          {/* KPIs hoje */}
          {isDiaria && (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hoje</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border bg-card p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums text-primary">{resultado.unidades_hoje}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{unidade === 'pacote' ? 'Pacotes' : 'Unidades'}</p>
                </div>
                <div className="rounded-xl border bg-card p-3 text-center">
                  <p className="text-2xl font-bold tabular-nums">{resultado.transacoes_hoje}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Vendas</p>
                </div>
                <div className="rounded-xl border bg-card p-3 text-center">
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtBRL(resultado.faturamento_hoje)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Faturamento</p>
                </div>
              </div>

              {metaLoja && (
                <div className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Meta da equipe hoje</span>
                    <span className="font-bold text-primary">{pctLoja}%</span>
                  </div>
                  <BarraProgresso valor={resultado.unidades_hoje} meta={metaLoja} cor={pctLoja && pctLoja >= 100 ? 'bg-emerald-500' : 'bg-primary'} />
                  <p className="text-[10px] text-muted-foreground">
                    {resultado.unidades_hoje} / {metaLoja} {unidade === 'pacote' ? 'pacotes' : 'unidades'}
                    {resultado.unidades_hoje < metaLoja
                      ? ` · Falta ${metaLoja - resultado.unidades_hoje}`
                      : ' · ✓ Meta atingida'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* KPIs totais */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total no período</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-bold tabular-nums text-primary">{resultado.total_unidades}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{unidade === 'pacote' ? 'Pacotes vendidos' : 'Unidades vendidas'}</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-2xl font-bold tabular-nums">{resultado.total_clientes}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clientes únicos</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {fmtBRL(resultado.total_faturamento)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Faturamento total</p>
            </div>
            <div className="rounded-xl border bg-card p-3">
              <p className="text-lg font-bold tabular-nums">
                {resultado.total_transacoes > 0
                  ? fmtBRL(resultado.total_faturamento / resultado.total_transacoes)
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Ticket médio</p>
            </div>
          </div>

          {resultado.total_unidades === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab Produtos ────────────────────────────────────────────────────── */}
      {tab === 'Produtos' && (
        <div className="space-y-3">
          {itensAtivos.map(item => {
            const res = resultado.por_produto.find(p => p.produto_id === item.produto_id)
            return (
              <div key={item.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-muted shrink-0 overflow-hidden">
                      {item.produto_foto_url ? (
                        <img src={item.produto_foto_url} alt={item.produto_nome} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                    <p className="font-semibold text-sm">{item.produto_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantidade_conteudo} {UNIDADE_LABELS[item.unidade_conteudo]} · {fmtBRL(item.preco_campanha)}
                      {item.preco_referencia && ` · ref. ${fmtBRL(item.preco_referencia)}`}
                    </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold tabular-nums text-primary">{res?.unidades ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">{unidade === 'pacote' ? 'pacotes' : 'unidades'}</p>
                  </div>
                </div>
                {res && res.unidades > 0 && (
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{res.transacoes} venda{res.transacoes !== 1 ? 's' : ''}</span>
                    <span>{fmtBRL(res.faturamento)} faturado</span>
                  </div>
                )}
              </div>
            )
          })}

          {itensAtivos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto participante.</p>
          )}
        </div>
      )}

      {/* ─── Tab Equipe ──────────────────────────────────────────────────────── */}
      {tab === 'Equipe' && (
        <div className="space-y-3">
          {resultado.por_participante.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda registrada ainda.</p>
          ) : (
            resultado.por_participante.map((p, idx) => {
              const meta = p.meta_individual ?? metaIndividual
              return (
                <div key={p.perfil_id} className="rounded-xl border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {idx === 0 && resultado.por_participante[0].unidades > 0 && (
                      <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.unidades} {unidade === 'pacote' ? 'pacotes' : 'unidades'}
                        {meta ? ` · meta: ${meta}` : ''}
                        {p.faturamento > 0 ? ` · ${fmtBRL(p.faturamento)}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold tabular-nums text-primary">{p.unidades}</p>
                      {p.pct_meta != null && (
                        <p className={`text-[10px] font-semibold ${p.pct_meta >= 100 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {p.pct_meta}%
                        </p>
                      )}
                    </div>
                  </div>
                  {meta && meta > 0 && (
                    <BarraProgresso
                      valor={p.unidades}
                      meta={meta}
                      cor={p.pct_meta != null && p.pct_meta >= 100 ? 'bg-emerald-500' : 'bg-primary'}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ─── Tab Financeiro ──────────────────────────────────────────────────── */}
      {tab === 'Financeiro' && (
        <AbaFinanceiro
          apuracoes={apuracoes}
          campanhaId={campanha.id}
          lojaId={lojaId}
          onRefresh={() => router.refresh()}
        />
      )}

      {/* ─── Tab Informações ─────────────────────────────────────────────────── */}
      {tab === 'Informações' && (
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuração</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-muted-foreground">Tipo</span>
              <span>{TIPO_LABELS[campanha.tipo]}</span>
              <span className="text-muted-foreground">Período</span>
              <span>{fmtData(campanha.data_inicio)} → {fmtData(campanha.data_fim)}</span>
              <span className="text-muted-foreground">Meta individual</span>
              <span>{campanha.meta_individual ?? '—'} {unidade === 'pacote' ? 'pacotes' : 'unidades'}/{isDiaria ? 'dia' : 'período'}</span>
              <span className="text-muted-foreground">Meta da equipe</span>
              <span>{campanha.meta_loja ?? '—'} {unidade === 'pacote' ? 'pacotes' : 'unidades'}/{isDiaria ? 'dia' : 'período'}</span>
            </div>
          </div>

          {campanha.orientacao_equipe && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Orientação para a equipe</p>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">{campanha.orientacao_equipe}</p>
            </div>
          )}

          {campanha.descricao && (
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição interna</p>
              <p className="text-xs text-foreground/70">{campanha.descricao}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
