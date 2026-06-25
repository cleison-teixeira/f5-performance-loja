'use client'
import { useRouter } from 'next/navigation'

interface Props {
  lojas: { id: string; nome: string }[]
  lojaAtiva: string
}

export function SeletorLoja({ lojas, lojaAtiva }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium shrink-0">Loja</label>
      <select
        value={lojaAtiva}
        onChange={e => {
          router.replace(`/configuracoes/equipe?loja_id=${e.target.value}`)
          router.refresh()
        }}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {lojas.map(l => (
          <option key={l.id} value={l.id}>{l.nome}</option>
        ))}
      </select>
    </div>
  )
}
