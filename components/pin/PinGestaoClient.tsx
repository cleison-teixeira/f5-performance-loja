'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verificarPinGestaoMembro } from '@/lib/pin/guard-actions'
import { Lock } from 'lucide-react'

interface Props {
  lojaId: string
}

export function PinGestaoClient({ lojaId }: Props) {
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    startTransition(async () => {
      const res = await verificarPinGestaoMembro(lojaId, pin)
      if (res.ok) {
        router.refresh()
      } else {
        setErro(res.erro ?? 'PIN inválido.')
        setPin('')
      }
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-3">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Área protegida</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Digite o PIN de dono ou gerente para acessar esta área.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••"
            autoFocus
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          {erro && (
            <p className="text-sm text-destructive text-center">{erro}</p>
          )}
          <button
            type="submit"
            disabled={pending || pin.length < 4}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {pending ? 'Verificando…' : 'Desbloquear'}
          </button>
        </form>
      </div>
    </div>
  )
}
