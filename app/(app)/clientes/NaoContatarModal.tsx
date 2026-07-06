'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, ShieldOff, ShieldCheck } from 'lucide-react'
import { marcarNaoContatar, reativarContato } from '@/lib/privacidade/naoContatar'

const MOTIVOS_MARCAR = [
  { value: 'cliente_pediu_whatsapp', label: 'Pedido pelo WhatsApp' },
  { value: 'cliente_pediu_presencial', label: 'Pedido presencial' },
  { value: 'cliente_reclamou_contato', label: 'Cliente reclamou de contato' },
  { value: 'ajuste_interno', label: 'Ajuste interno' },
  { value: 'outro', label: 'Outro' },
]

interface MarcarProps {
  clienteId: string
  clienteNome: string
  lojaId: string
  onFechar: () => void
}

export function NaoContatarMarcarModal({ clienteId, clienteNome, lojaId, onFechar }: MarcarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [motivo, setMotivo] = useState('cliente_pediu_whatsapp')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    setErro(null)
    startTransition(async () => {
      const res = await marcarNaoContatar({
        cliente_id: clienteId,
        loja_id: lojaId,
        motivo,
        origem: motivo,
        observacao: observacao.trim() || undefined,
      })
      if (res.ok) {
        router.refresh()
        onFechar()
      } else {
        setErro(res.erro ?? 'Erro ao salvar.')
      }
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onFechar} />
      <div className="fixed inset-x-4 bottom-4 z-[90] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-semibold">Marcar cliente como Não Contatar</h2>
          </div>
          <button onClick={onFechar} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Use esta opção quando <strong>{clienteNome}</strong> pedir para não receber mensagens ou contatos ativos da loja.
          </p>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Motivo
            </label>
            <select
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {MOTIVOS_MARCAR.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Observação <span className="font-normal normal-case text-muted-foreground/60">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Descreva rapidamente o contexto, sem inserir dados sensíveis."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
            />
            <p className="mt-1 text-[10px] text-muted-foreground/60 leading-snug">
              Não insira dados sensíveis, diagnósticos médicos ou informações desnecessárias.
            </p>
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirmar}
              disabled={isPending}
              className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Salvando…' : 'Confirmar Não Contatar'}
            </button>
            <button
              onClick={onFechar}
              disabled={isPending}
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

interface ReativarProps {
  clienteId: string
  clienteNome: string
  lojaId: string
  onFechar: () => void
}

export function ReativarContatoModal({ clienteId, clienteNome, lojaId, onFechar }: ReativarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function handleConfirmar() {
    setErro(null)
    startTransition(async () => {
      const res = await reativarContato({ cliente_id: clienteId, loja_id: lojaId })
      if (res.ok) {
        router.refresh()
        onFechar()
      } else {
        setErro(res.erro ?? 'Erro ao reativar.')
      }
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onFechar} />
      <div className="fixed inset-x-4 bottom-4 z-[90] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h2 className="text-base font-semibold">Reativar contato do cliente</h2>
          </div>
          <button onClick={onFechar} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2.5">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Reative apenas se houver autorização ou motivo legítimo para voltar a contatar <strong>{clienteNome}</strong>.
            </p>
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirmar}
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Reativando…' : 'Reativar contato'}
            </button>
            <button
              onClick={onFechar}
              disabled={isPending}
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
