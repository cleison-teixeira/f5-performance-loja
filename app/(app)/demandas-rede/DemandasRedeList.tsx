'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Building2, Package, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  responderDemandaRede,
  resolverDemandaRede,
  cancelarDemandaRede,
  type DemandaRede,
  type TipoResposta,
} from './actions'
import { normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'

const STATUS_LABELS: Record<string, string> = {
  em_busca:  'Em busca',
  encontrado: 'Encontrado',
  separado:  'Separado',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  em_busca:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  encontrado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  separado:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolvido:  'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  cancelado:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

function fmtData(iso: string) {
  const date = iso.includes('T') ? iso.split('T')[0] : iso
  const [ano, mes, dia] = date.split('-')
  return `${dia}/${mes}/${ano.slice(2)}`
}

function gerarMensagemGrupo(demanda: DemandaRede): string {
  const obs = demanda.observacao_operacional ? `\nObs.: ${demanda.observacao_operacional}` : ''
  return `Pessoal, a loja ${demanda.loja_origem_nome} precisa de:\n- ${normalizarNomeProduto(demanda.produto_nome)}, ${demanda.quantidade} unid.\n\nCliente aguardando. Alguma loja tem para separar?${obs}`
}

function CopiarMensagemButton({ demanda }: { demanda: DemandaRede }) {
  const [copiado, setCopiado] = useState(false)
  function handleCopiar() {
    navigator.clipboard.writeText(gerarMensagemGrupo(demanda)).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }).catch(() => {})
  }
  return (
    <button
      onClick={handleCopiar}
      className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
    >
      {copiado ? <><Check className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Copiado</span></> : <><Copy className="h-3.5 w-3.5" /><span>Copiar msg para grupo</span></>}
    </button>
  )
}

function ResponderModal({
  demanda,
  lojaRespostaId,
  lojaRespostaNome,
  userNome,
  onClose,
}: {
  demanda: DemandaRede
  lojaRespostaId: string
  lojaRespostaNome: string
  userNome: string
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tipoResposta, setTipoResposta] = useState<TipoResposta>('tenho_estoque')
  const [quantidade, setQuantidade] = useState<string>('')
  const [observacao, setObservacao] = useState('')

  function handleResponder() {
    startTransition(async () => {
      const res = await responderDemandaRede({
        demandaId: demanda.id,
        lojaRespostaId,
        lojaRespostaNome,
        usuarioRespostaNome: userNome,
        tipoResposta,
        quantidadeDisponivel: quantidade ? parseInt(quantidade, 10) : null,
        observacao: observacao.trim() || null,
      })
      if (res.ok) {
        router.refresh()
        onClose()
      } else {
        alert(res.error || 'Erro ao responder')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl p-6 space-y-4">
        <h2 className="text-base font-bold">Responder demanda da rede</h2>

        <div className="rounded-xl bg-muted/50 p-3 space-y-1 text-sm">
          <p className="font-semibold">{normalizarNomeProduto(demanda.produto_nome)}</p>
          <p className="text-xs text-muted-foreground">{demanda.quantidade} unid. · Solicitado por {demanda.loja_origem_nome}</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(['tenho_estoque', 'posso_separar'] as TipoResposta[]).map(tipo => (
              <button
                key={tipo}
                onClick={() => setTipoResposta(tipo)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold text-left transition-colors ${tipoResposta === tipo ? 'border-primary bg-primary/5 text-primary' : 'border-input hover:bg-accent'}`}
              >
                {tipo === 'tenho_estoque' ? '✓ Tenho em estoque' : '○ Posso separar'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantidade disponível (opcional)</label>
            <input
              type="number"
              min="1"
              value={quantidade}
              onChange={e => setQuantidade(e.target.value)}
              placeholder="Ex.: 2"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Observação (opcional)</label>
            <input
              type="text"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex.: produto na loja até quinta"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={handleResponder}
            disabled={isPending}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isPending ? 'Enviando…' : 'Confirmar resposta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DemandaCard({
  demanda,
  lojaId,
  lojaIds,
  lojaNome,
  userNome,
}: {
  demanda: DemandaRede
  lojaId: string | null
  lojaIds: string[]
  lojaNome: string
  userNome: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [respondendo, setRespondendo] = useState(false)

  const isMinhaLoja = lojaIds.includes(demanda.loja_origem_id)
  const podeResponder = !isMinhaLoja && lojaId !== null && lojaId !== demanda.loja_origem_id && demanda.status === 'em_busca'
  const podeGerenciar = isMinhaLoja

  function handleResolver() {
    if (!lojaId) return
    const lojaGerenteId = lojaIds.find(id => id === demanda.loja_origem_id) ?? lojaId
    startTransition(async () => {
      const res = await resolverDemandaRede(demanda.id, lojaGerenteId)
      if (res.ok) router.refresh()
      else alert(res.error || 'Erro ao resolver')
    })
  }

  function handleCancelar() {
    if (!lojaId) return
    const lojaGerenteId = lojaIds.find(id => id === demanda.loja_origem_id) ?? lojaId
    startTransition(async () => {
      const res = await cancelarDemandaRede(demanda.id, lojaGerenteId)
      if (res.ok) router.refresh()
      else alert(res.error || 'Erro ao cancelar')
    })
  }

  return (
    <>
      {respondendo && lojaId && (
        <ResponderModal
          demanda={demanda}
          lojaRespostaId={lojaId}
          lojaRespostaNome={lojaNome}
          userNome={userNome}
          onClose={() => setRespondendo(false)}
        />
      )}

      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{normalizarNomeProduto(demanda.produto_nome)}</p>
              <p className="text-xs text-muted-foreground">{demanda.quantidade} unid.</p>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[demanda.status] ?? ''}`}>
            {STATUS_LABELS[demanda.status] ?? demanda.status}
          </span>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <p className="text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> Loja solicitante</p>
            <p className="font-medium">{demanda.loja_origem_nome}</p>
          </div>
          {demanda.responsavel_origem_nome && (
            <div>
              <p className="text-muted-foreground">Responsável</p>
              <p className="font-medium">{demanda.responsavel_origem_nome}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Data</p>
            <p className="font-medium">{fmtData(demanda.criado_em)}</p>
          </div>
          {demanda.observacao_operacional && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Observação</p>
              <p className="leading-relaxed">{demanda.observacao_operacional}</p>
            </div>
          )}
        </div>

        {/* Respostas */}
        {demanda.respostas && demanda.respostas.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
              {demanda.respostas.length} resposta{demanda.respostas.length !== 1 ? 's' : ''}
            </p>
            {demanda.respostas.map(r => (
              <div key={r.id} className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 px-3 py-2 text-xs space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">{r.loja_resposta_nome}</p>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {r.tipo_resposta === 'tenho_estoque' ? '✓ Tem em estoque' : '○ Pode separar'}
                  </span>
                </div>
                {r.quantidade_disponivel && (
                  <p className="text-emerald-700/70 dark:text-emerald-400/70">{r.quantidade_disponivel} unid. disponíveis</p>
                )}
                {r.usuario_resposta_nome && (
                  <p className="text-muted-foreground">Respondido por {r.usuario_resposta_nome}</p>
                )}
                {r.observacao && <p className="text-foreground/70">{r.observacao}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 border-t pt-3">
          <CopiarMensagemButton demanda={demanda} />

          {podeResponder && (
            <button
              onClick={() => setRespondendo(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Responder
            </button>
          )}

          {podeGerenciar && (demanda.status === 'em_busca' || demanda.status === 'encontrado' || demanda.status === 'separado') && (
            <>
              <button
                onClick={handleResolver}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Marcar como resolvida
              </button>
              <button
                onClick={handleCancelar}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-60"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

interface Props {
  demandas: DemandaRede[]
  lojaId: string | null
  lojaIds: string[]
  lojaNome: string
  userNome: string
  escopo: 'loja' | 'rede'
}

export function DemandasRedeList({ demandas, lojaId, lojaIds, lojaNome, userNome, escopo }: Props) {
  if (demandas.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Nenhuma demanda em aberto na rede"
        description="Quando uma loja buscar um produto na rede, a demanda aparece aqui para todas as lojas conectadas."
      />
    )
  }

  return (
    <div className="space-y-4">
      {escopo === 'rede' && (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2 leading-relaxed">
          Selecione uma loja no seletor <strong>Visão</strong> acima para responder a demandas de outras lojas.
        </p>
      )}
      <div className="space-y-3">
        {demandas.map(d => (
          <DemandaCard
            key={d.id}
            demanda={d}
            lojaId={lojaId}
            lojaIds={lojaIds}
            lojaNome={lojaNome}
            userNome={userNome}
          />
        ))}
      </div>
    </div>
  )
}
