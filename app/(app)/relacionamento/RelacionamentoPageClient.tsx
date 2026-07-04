'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { AvisosLista } from '@/app/(app)/avisos/AvisosLista'
import { carregarMaisRelacionamento } from './actions'
import type { AvisoDetalhado } from '@/app/(app)/avisos/types'
import type { VendedoraLoja } from '@/app/(app)/avisos/AvisosLista'

interface Props {
  initialAvisos: AvisoDetalhado[]
  initialNextCursor: string | null
  hoje: string
  vendedorasLoja: VendedoraLoja[]
  loja_id: string
  isVendedora: boolean
  mostrarLoja: boolean
}

export function RelacionamentoPageClient({
  initialAvisos,
  initialNextCursor,
  hoje,
  vendedorasLoja,
  loja_id,
  isVendedora,
  mostrarLoja,
}: Props) {
  const [avisos, setAvisos] = useState<AvisoDetalhado[]>(initialAvisos)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function carregarMais() {
    if (!nextCursor || isPending) return
    startTransition(async () => {
      const result = await carregarMaisRelacionamento(nextCursor)
      setAvisos(prev => [...prev, ...result.avisos])
      setNextCursor(result.nextCursor)
    })
  }

  return (
    <>
      <AvisosLista
        avisos={avisos}
        hoje={hoje}
        catalogo={[]}
        percentuaisPorVendedora={{}}
        vendedorasLoja={vendedorasLoja}
        loja_id={loja_id}
        isVendedora={isVendedora}
        mode="relacionamento"
        mostrarLoja={mostrarLoja}
      />
      {nextCursor && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={carregarMais}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Carregar mais mensagens
          </button>
        </div>
      )}
    </>
  )
}
