'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ativarOperador } from '@/lib/operador/actions'
import type { MembroSelecionavel } from '@/lib/operador/contexto'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<string, string> = {
  dono: 'Dono',
  gerente: 'Gerente',
  vendedora: 'Vendedora',
  admin_f5: 'Admin F5',
}

const ROLE_BADGE: Record<string, string> = {
  dono: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  gerente: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  vendedora: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
}

interface Props {
  membros: MembroSelecionavel[]
  lojaId: string
  lojaNome: string
}

export function SelecionarOperadorClient({ membros, lojaId, lojaNome }: Props) {
  const router = useRouter()
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleEntrar(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado) return
    if (!/^\d{4,6}$/.test(pin)) {
      setErro('PIN deve ter 4 a 6 dígitos.')
      return
    }
    setCarregando(true)
    setErro(null)
    const res = await ativarOperador(selecionado, lojaId, pin)
    setCarregando(false)
    if (res.ok) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setErro(res.erro ?? 'PIN inválido.')
      setPin('')
    }
  }

  async function handleSair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-xl font-semibold">Quem está usando agora?</h1>
        <p className="text-sm text-muted-foreground">{lojaNome}</p>
      </div>

      <div className="space-y-2">
        {membros.map(m => (
          <button
            key={m.membroId}
            type="button"
            onClick={() => { setSelecionado(m.membroId); setPin(''); setErro(null) }}
            className={cn(
              'w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors',
              selecionado === m.membroId
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:bg-accent'
            )}
          >
            <span className="text-sm font-medium">{m.nome || '(sem nome)'}</span>
            <span className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              ROLE_BADGE[m.role] ?? 'bg-muted text-muted-foreground'
            )}>
              {ROLE_LABEL[m.role] ?? m.role}
            </span>
          </button>
        ))}
      </div>

      {selecionado && (
        <form onSubmit={handleEntrar} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="pin-input" className="text-sm font-medium">PIN</label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {erro && <p className="text-sm text-destructive text-center">{erro}</p>}

          <button
            type="submit"
            disabled={carregando || pin.length < 4}
            className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {carregando ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      )}

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={handleSair}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
