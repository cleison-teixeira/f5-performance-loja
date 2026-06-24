'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { marcarOportunidadePerdida } from './actions'
import type { AvisoDetalhado } from './types'

const MOTIVOS = [
  'Não gostou do produto',
  'Sem dinheiro agora',
  'Comprou em outro lugar',
  'Achou caro',
  'Não usa mais',
  'Sem resposta',
  'Outro',
]

interface Props {
  aviso: AvisoDetalhado
  onSucesso: () => void
  onFechar: () => void
}

export function PerderOportunidadeModal({ aviso, onSucesso, onFechar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleConfirmar() {
    if (!motivo) return
    setLoading(true)
    setErro(null)
    const res = await marcarOportunidadePerdida({
      aviso_id: aviso.id,
      venda_id: aviso.venda_id,
      item_venda_id: aviso.item_venda_id,
      motivo_perda: motivo,
      observacao: observacao.trim() || undefined,
    })
    setLoading(false)
    if (res.ok) {
      onSucesso()
    } else {
      setErro(res.erro ?? 'Erro ao registrar perda')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onFechar} />
      <div className="fixed inset-x-4 bottom-4 z-[90] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-background z-10">
          <div>
            <h2 className="text-base font-semibold">Cliente não quer mais</h2>
            <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[260px]">
              {aviso.cliente_nome} · {aviso.produto_nome}
            </p>
          </div>
          <button onClick={onFechar} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors flex-none">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2 block">
              Motivo <span className="text-destructive">*</span>
            </label>
            <div className="grid gap-1.5">
              {MOTIVOS.map(m => (
                <button
                  key={m}
                  onClick={() => setMotivo(m)}
                  className={`rounded-lg border px-4 py-2.5 text-sm text-left font-medium transition-colors ${
                    motivo === m
                      ? 'border-destructive bg-destructive/10 text-destructive dark:text-red-400'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Observação <span className="font-normal normal-case text-muted-foreground/60">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Detalhe o que foi dito..."
              rows={2}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
            />
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirmar}
              disabled={loading || !motivo}
              className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Registrando…' : 'Confirmar perda'}
            </button>
            <button
              onClick={onFechar}
              disabled={loading}
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
