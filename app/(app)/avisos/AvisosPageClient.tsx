'use client'

import { useState } from 'react'
import { AvisosLista } from './AvisosLista'
import type { AvisoDetalhado, ItemVendaGrupo } from './types'
import type { CatalogoProduto } from './page'
import type { VendedoraLoja } from './AvisosLista'
import type { TaxaConversaoRecompra } from '@/lib/metricas/taxa-conversao'

interface Props {
  initialAvisos: AvisoDetalhado[]
  initialItensVenda: Record<string, ItemVendaGrupo[]>
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
  const [avisos] = useState<AvisoDetalhado[]>(initialAvisos)
  const [itensVendaPorVenda] = useState<Record<string, ItemVendaGrupo[]>>(initialItensVenda)

  return (
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
  )
}
