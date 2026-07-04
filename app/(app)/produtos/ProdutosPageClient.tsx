'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { ProdutosLista, type ProdutoCard } from './ProdutosLista'
import { carregarMaisProdutos } from './actions'

interface Props {
  initialLista: ProdutoCard[]
  initialNextCursor: string | null
  podeEditar: boolean
}

export function ProdutosPageClient({ initialLista, initialNextCursor, podeEditar }: Props) {
  const [lista, setLista] = useState<ProdutoCard[]>(initialLista)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function carregarMais() {
    if (!nextCursor || isPending) return
    startTransition(async () => {
      const result = await carregarMaisProdutos(nextCursor)
      setLista(prev => [...prev, ...result.lista])
      setNextCursor(result.nextCursor)
    })
  }

  return (
    <>
      <ProdutosLista lista={lista} podeEditar={podeEditar} />
      {nextCursor && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={carregarMais}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Carregar mais produtos
          </button>
        </div>
      )}
    </>
  )
}
