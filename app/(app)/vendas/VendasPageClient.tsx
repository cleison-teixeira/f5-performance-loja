'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { VendasLista } from './VendasLista'
import { carregarMaisVendas } from './actions'
import type { VendaExtrato } from './page'

interface Props {
  initialVendas: VendaExtrato[]
  initialNextCursor: string | null
  isVendedora: boolean
  vendedoras: { id: string; nome: string }[]
  mostrarLoja: boolean
}

export function VendasPageClient({
  initialVendas,
  initialNextCursor,
  isVendedora,
  vendedoras,
  mostrarLoja,
}: Props) {
  const [vendas, setVendas] = useState<VendaExtrato[]>(initialVendas)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function carregarMais() {
    if (!nextCursor || isPending) return
    startTransition(async () => {
      const result = await carregarMaisVendas(nextCursor)
      setVendas(prev => [...prev, ...result.vendas])
      setNextCursor(result.nextCursor)
    })
  }

  return (
    <>
      <VendasLista vendas={vendas} isVendedora={isVendedora} vendedoras={vendedoras} mostrarLoja={mostrarLoja} />
      {nextCursor && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={carregarMais}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando...</>
              : 'Carregar mais vendas'
            }
          </button>
        </div>
      )}
    </>
  )
}
