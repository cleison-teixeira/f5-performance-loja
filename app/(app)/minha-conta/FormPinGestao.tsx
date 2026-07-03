'use client'
import { useState, useTransition } from 'react'
import { salvarPinGestao } from '@/lib/pin/actions'

interface Props {
  lojaId: string
  temPin: boolean
}

const inputPinClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-center text-xl tracking-[0.4em] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function FormPinGestao({ lojaId, temPin }: Props) {
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4 || pinConfirm.length !== 4) {
      setMsg({ tipo: 'erro', texto: 'PIN deve ter exatamente 4 dígitos.' })
      return
    }
    setMsg(null)
    startTransition(async () => {
      const res = await salvarPinGestao(lojaId, pin, pinConfirm)
      if (res.ok) {
        setMsg({ tipo: 'ok', texto: 'PIN gerencial salvo.' })
        setPin('')
        setPinConfirm('')
      } else {
        setMsg({ tipo: 'erro', texto: res.erro ?? 'Erro ao salvar PIN.' })
      }
    })
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4 mt-6">
      <div>
        <h2 className="text-base font-semibold">PIN gerencial</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Use este PIN para proteger Minha Conta, Equipe e Bibliotecas.
        </p>
        {temPin && (
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
            PIN já configurado. Preencha abaixo para alterar.
          </p>
        )}
      </div>

      <form onSubmit={handleSalvar} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Novo PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={inputPinClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirmar PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className={inputPinClass}
            />
          </div>
        </div>

        {msg && (
          <p className={`text-sm font-medium ${msg.tipo === 'ok' ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
            {msg.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || pin.length !== 4 || pinConfirm.length !== 4}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          {pending ? 'Salvando…' : 'Salvar PIN'}
        </button>
      </form>
    </div>
  )
}
