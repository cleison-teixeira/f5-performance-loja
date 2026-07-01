'use client'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLojaContexto } from '@/lib/loja/actions'

interface Props {
  lojas: { id: string; nome: string }[]
  lojaAtiva: string | null
}

export function SeletorLojaGlobal({ lojas, lojaAtiva }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const umaLoja = lojas.length === 1

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    startTransition(async () => {
      await setLojaContexto(val || null)
      router.refresh()
    })
  }

  return (
    <div className="border-b bg-muted/30 px-4 py-2 flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground shrink-0">Visão</span>
      <select
        value={lojaAtiva ?? ''}
        onChange={handleChange}
        disabled={isPending || umaLoja}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-100 disabled:cursor-default transition-opacity flex-1 min-w-0"
      >
        {!umaLoja && <option value="">Toda a rede</option>}
        {lojas.map(l => (
          <option key={l.id} value={l.id}>{l.nome}</option>
        ))}
      </select>
    </div>
  )
}
