'use client'
import { useState, useTransition } from 'react'
import { salvarPinMembro, togglePinMembro } from './actions'

interface Props {
  membro_id: string
  loja_id: string
  pin_ativo: boolean
  tem_pin_hash: boolean
  onConcluido: () => void
}

export function FormPinMembro({ membro_id, loja_id, pin_ativo, tem_pin_hash, onConcluido }: Props) {
  const [pin, setPin] = useState('')
  const [pinConfirma, setPinConfirma] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function showMsg(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto })
    if (tipo === 'ok') setTimeout(onConcluido, 800)
  }

  function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await salvarPinMembro({ membro_id, loja_id, pin, pin_confirma: pinConfirma })
      if (res.ok) showMsg('ok', 'PIN salvo e ativado.')
      else showMsg('erro', res.erro ?? 'Erro ao salvar PIN.')
    })
  }

  function handleToggle(ativo: boolean) {
    startTransition(async () => {
      const res = await togglePinMembro({ membro_id, loja_id, ativo })
      if (res.ok) showMsg('ok', ativo ? 'PIN ativado.' : 'PIN desativado.')
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-1.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-ring/50'

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3 mt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configurar PIN</p>

      <form onSubmit={handleSalvar} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Novo PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Confirmar</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinConfirma}
              onChange={e => setPinConfirma(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className={inputCls}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">4 a 6 dígitos. Salvar ativa o PIN automaticamente.</p>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="submit"
            disabled={pending || pin.length < 4 || pinConfirma.length < 4}
            className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {pending ? 'Salvando…' : 'Salvar PIN'}
          </button>

          {tem_pin_hash && (
            pin_ativo ? (
              <button
                type="button"
                onClick={() => handleToggle(false)}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
              >
                Desativar PIN
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggle(true)}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Ativar PIN
              </button>
            )
          )}

          <button
            type="button"
            onClick={onConcluido}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>

      {msg && (
        <p className={`text-xs font-medium ${msg.tipo === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
          {msg.texto}
        </p>
      )}
    </div>
  )
}
