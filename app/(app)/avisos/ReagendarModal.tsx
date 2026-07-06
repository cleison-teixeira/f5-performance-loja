'use client'

import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { reagendarOportunidade } from './actions'
import type { AvisoDetalhado } from './types'

interface Props {
  aviso: AvisoDetalhado
  onSucesso: (novaData: string) => void
  onFechar: () => void
}

function addDias(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const RAPIDOS = [
  { label: '+7 dias', dias: 7 },
  { label: '+15 dias', dias: 15 },
  { label: '+30 dias', dias: 30 },
]

export function ReagendarModal({ aviso, onSucesso, onFechar }: Props) {
  const amanha = addDias(1)
  const [novaData, setNovaData] = useState(addDias(7))
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleConfirmar() {
    if (!novaData) return
    setLoading(true)
    setErro(null)
    const res = await reagendarOportunidade({
      aviso_id: aviso.id,
      venda_id: aviso.venda_id,
      item_venda_id: aviso.item_venda_id,
      nova_data: novaData,
      observacao: observacao.trim() || undefined,
    })
    setLoading(false)
    if (res.ok) {
      onSucesso(novaData)
    } else {
      setErro(res.erro ?? 'Erro ao reagendar')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={onFechar} />
      <div className="fixed inset-x-4 bottom-4 z-[90] md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-background rounded-2xl shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold">Reagendar</h2>
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2">Opções rápidas</p>
            <div className="flex gap-2">
              {RAPIDOS.map(({ label, dias }) => {
                const val = addDias(dias)
                return (
                  <button
                    key={dias}
                    onClick={() => setNovaData(val)}
                    className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                      novaData === val
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Data de retorno
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={novaData}
                min={amanha}
                onChange={e => setNovaData(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-1.5 block">
              Observação <span className="font-normal normal-case text-muted-foreground/60">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: cliente pediu para retornar após o pagamento"
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
              disabled={loading || !novaData}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Reagendando…' : 'Confirmar reagendamento'}
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
