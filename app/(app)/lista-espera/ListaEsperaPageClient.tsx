'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { ListaEsperaCards, type RegistroListaEspera } from './ListaEsperaCards'
import { carregarMaisListaEspera } from './actions'

interface Props {
  initialRegistros: RegistroListaEspera[]
  initialNextCursor: string | null
  defaultLojaNome: string
  vendedoras: Array<{ id: string; nome: string }>
  produtos: Array<{ id: string; nome: string }>
  podeEditar: boolean
}

export function ListaEsperaPageClient({
  initialRegistros,
  initialNextCursor,
  defaultLojaNome,
  vendedoras,
  produtos,
  podeEditar,
}: Props) {
  const [registros, setRegistros] = useState<RegistroListaEspera[]>(initialRegistros)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function carregarMais() {
    if (!nextCursor || isPending) return
    startTransition(async () => {
      const result = await carregarMaisListaEspera(nextCursor)
      setRegistros(prev => [...prev, ...result.registros])
      setNextCursor(result.nextCursor)
    })
  }

  return (
    <>
      <ListaEsperaCards
        registros={registros}
        defaultLojaNome={defaultLojaNome}
        vendedoras={vendedoras}
        produtos={produtos}
        podeEditar={podeEditar}
      />
      {nextCursor && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={carregarMais}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Carregar mais registros
          </button>
        </div>
      )}
    </>
  )
}
