'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Network, ExternalLink } from 'lucide-react'
import { criarDemandaRede } from '@/app/(app)/demandas-rede/actions'
import { normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'

const STATUS_LABELS: Record<string, string> = {
  em_busca:   'Em busca na rede',
  encontrado: 'Encontrado na rede',
  separado:   'Sendo separado',
}

interface Props {
  itemId: string
  produtoNome: string
  produtoId: string | null
  quantidade: number
  lojaId: string
  lojaNome: string
  responsavelId: string | null
  responsavelNome: string
  demandaAtiva: { id: string; status: string } | null
  onClose: () => void
}

export function BuscarNaRedeModal({
  itemId,
  produtoNome,
  produtoId,
  quantidade,
  lojaId,
  lojaNome,
  responsavelId,
  responsavelNome,
  demandaAtiva,
  onClose,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [observacao, setObservacao] = useState('')
  const [copiado, setCopiado] = useState(false)

  const nomeProdutoFormatado = normalizarNomeProduto(produtoNome)

  const mensagemGrupo = [
    `Pessoal, a loja ${lojaNome} precisa de:`,
    `- ${nomeProdutoFormatado}, ${quantidade} unid.`,
    '',
    'Cliente aguardando. Alguma loja tem para separar?',
    observacao.trim() ? `\nObs.: ${observacao.trim()}` : '',
  ].filter((l, i) => i !== 4 || l !== '').join('\n').trim()

  function handleCopiarMensagem() {
    const msg = [
      `Pessoal, a loja ${lojaNome} precisa de:`,
      `- ${nomeProdutoFormatado}, ${quantidade} unid.`,
      '',
      'Cliente aguardando. Alguma loja tem para separar?',
    ].join('\n')
    const msgFinal = observacao.trim() ? `${msg}\n\nObs.: ${observacao.trim()}` : msg
    navigator.clipboard.writeText(msgFinal).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }).catch(() => {})
  }

  function handleCriarDemanda() {
    startTransition(async () => {
      const res = await criarDemandaRede({
        lojaOrigemId: lojaId,
        lojaOrigemNome: lojaNome,
        responsavelOrigemId: responsavelId,
        responsavelOrigemNome: responsavelNome !== '—' ? responsavelNome : null,
        listaEsperaId: itemId,
        produtoId,
        produtoNome,
        quantidade,
        observacaoOperacional: observacao.trim() || null,
      })
      if (res.ok) {
        router.refresh()
        onClose()
      } else {
        alert(res.error || 'Erro ao criar demanda')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-background rounded-2xl shadow-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Network className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-bold">Buscar na rede</h2>
        </div>

        {/* Produto */}
        <div className="rounded-xl bg-muted/50 p-3 space-y-1">
          <p className="text-sm font-semibold">{nomeProdutoFormatado}</p>
          <p className="text-xs text-muted-foreground">{quantidade} unid. · {lojaNome}</p>
          {responsavelNome && responsavelNome !== '—' && (
            <p className="text-xs text-muted-foreground">Responsável: {responsavelNome}</p>
          )}
        </div>

        {/* Se já existe demanda ativa */}
        {demandaAtiva ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                {STATUS_LABELS[demandaAtiva.status] ?? demandaAtiva.status}
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                Esta demanda já está ativa na rede. Veja as respostas em Demandas da Rede.
              </p>
            </div>

            <a
              href="/demandas-rede"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Ver demandas da rede
            </a>

            <button
              onClick={handleCopiarMensagem}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              {copiado ? <><Check className="h-4 w-4 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Copiado</span></> : <><Copy className="h-4 w-4" /><span>Copiar mensagem para grupo</span></>}
            </button>

            <button onClick={onClose} className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Observação operacional */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Observação operacional (opcional)
              </label>
              <input
                type="text"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Ex.: precisa para esta semana"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Não incluir dados do cliente.</p>
            </div>

            {/* Preview da mensagem */}
            <div className="rounded-lg bg-muted/50 px-3 py-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Mensagem para o grupo</p>
              <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">{mensagemGrupo}</p>
            </div>

            <button
              onClick={handleCopiarMensagem}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              {copiado ? <><Check className="h-4 w-4 text-emerald-500" /><span className="text-emerald-600 dark:text-emerald-400">Copiado</span></> : <><Copy className="h-4 w-4" /><span>Copiar mensagem para grupo</span></>}
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={isPending}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriarDemanda}
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {isPending ? 'Criando…' : 'Criar demanda na rede'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
