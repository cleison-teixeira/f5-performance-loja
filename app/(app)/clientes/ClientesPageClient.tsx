'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { ClientesLista, type ClienteItem } from './ClientesLista'
import { carregarMaisClientes } from './actions'

interface Props {
  initialClientes: ClienteItem[]
  initialNextCursor: string | null
  mostrarLoja: boolean
}

export function ClientesPageClient({ initialClientes, initialNextCursor, mostrarLoja }: Props) {
  const [clientes, setClientes] = useState<ClienteItem[]>(initialClientes)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function carregarMais() {
    if (!nextCursor || isPending) return
    startTransition(async () => {
      const result = await carregarMaisClientes(nextCursor)
      setClientes(prev => [...prev, ...result.clientes])
      setNextCursor(result.nextCursor)
    })
  }

  return (
    <>
      <ClientesLista clientes={clientes} mostrarLoja={mostrarLoja} />
      {nextCursor && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={carregarMais}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando...</>
              : 'Carregar mais clientes'
            }
          </button>
        </div>
      )}
    </>
  )
}
