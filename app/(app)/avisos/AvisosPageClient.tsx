'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { AvisosLista } from './AvisosLista'
import { carregarMaisAvisos } from './actions'
import type { AvisoDetalhado, ItemVendaGrupo } from './types'
import type { CatalogoProduto } from './page'
import type { VendedoraLoja } from './AvisosLista'
import type { TaxaConversaoRecompra } from '@/lib/metricas/taxa-conversao'

interface Props {
  initialAvisos: AvisoDetalhado[]
  initialItensVenda: Record<string, ItemVendaGrupo[]>
  initialNextCursor: string | null
  hoje: string
  catalogo: CatalogoProduto[]
  percentuaisPorVendedora: Record<string, number>
  vendedorasLoja: VendedoraLoja[]
  loja_id: string
  loja_nome?: string
  isVendedora: boolean
  totalRecomprasValorMes: number
  qtdRecomprasMes: number
  mostrarLoja: boolean
  taxaConversao?: TaxaConversaoRecompra
}

export function AvisosPageClient({
  initialAvisos,
  initialItensVenda,
  initialNextCursor,
  hoje,
  catalogo,
  percentuaisPorVendedora,
  vendedorasLoja,
  loja_id,
  loja_nome,
  isVendedora,
  totalRecomprasValorMes,
  qtdRecomprasMes,
  mostrarLoja,
  taxaConversao,
}: Props) {
  const [avisos, setAvisos] = useState<AvisoDetalhado[]>(initialAvisos)
  const [itensVendaPorVenda, setItensVenda] = useState<Record<string, ItemVendaGrupo[]>>(initialItensVenda)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isPending, startTransition] = useTransition()

  function carregarMais() {
    if (!nextCursor || isPending) return
    startTransition(async () => {
      const result = await carregarMaisAvisos(nextCursor)
      setAvisos(prev => [...prev, ...result.avisos])
      setItensVenda(prev => ({ ...prev, ...result.itensVenda }))
      setNextCursor(result.nextCursor)
    })
  }

  return (
    <>
      <AvisosLista
        avisos={avisos}
        hoje={hoje}
        catalogo={catalogo}
        percentuaisPorVendedora={percentuaisPorVendedora}
        vendedorasLoja={vendedorasLoja}
        loja_id={loja_id}
        loja_nome={loja_nome}
        isVendedora={isVendedora}
        mode="recompra"
        totalRecomprasValorMes={totalRecomprasValorMes}
        qtdRecomprasMes={qtdRecomprasMes}
        mostrarLoja={mostrarLoja}
        taxaConversao={taxaConversao}
        itensVendaPorVenda={itensVendaPorVenda}
      />
      {nextCursor && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={carregarMais}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Carregando...</>
              : 'Carregar mais avisos'
            }
          </button>
        </div>
      )}
    </>
  )
}
