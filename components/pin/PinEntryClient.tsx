'use client'
import { useState } from 'react'
import { verificarPinGestaoAction } from '@/lib/pin/actions'

interface Props {
  lojaId: string
  children: React.ReactNode
}

export function PinEntryClient({ lojaId, children }: Props) {
  const [desbloqueado, setDesbloqueado] = useState(false)
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  // PIN correto: mostra conteúdo protegido via estado local (some ao navegar)
  if (desbloqueado) return <>{children}</>

  async function handleDesbloquear(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) {
      setErro('PIN deve ter exatamente 4 dígitos.')
      return
    }
    setCarregando(true)
    setErro(null)
    const res = await verificarPinGestaoAction(lojaId, pin)
    setCarregando(false)
    if (res.ok) {
      setDesbloqueado(true)
    } else {
      setErro(res.erro ?? 'PIN inválido.')
      setPin('')
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Área gerencial</h1>
          <p className="text-sm text-muted-foreground">
            Digite o PIN gerencial para acessar esta área.
          </p>
        </div>

        <form onSubmit={handleDesbloquear} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="pin-entrada" className="text-sm font-medium">PIN</label>
            <input
              id="pin-entrada"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="••••"
              autoFocus
            />
          </div>

          {erro && <p className="text-sm text-destructive text-center">{erro}</p>}

          <button
            type="submit"
            disabled={carregando || pin.length !== 4}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
          >
            {carregando ? 'Verificando…' : 'Desbloquear'}
          </button>
        </form>

        <div className="text-center">
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Voltar para o painel
          </a>
        </div>
      </div>
    </div>
  )
}
