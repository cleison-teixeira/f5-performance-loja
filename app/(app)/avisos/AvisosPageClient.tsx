'use client'

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
  if (typeof window !== 'undefined') {
    console.log('[PILOT0003-CHAIN][AvisosPageClient]', JSON.stringify({
      ts: new Date().toISOString(),
      initialAvisosCount: initialAvisos.length,
      nomesClientes: initialAvisos.map(a => a.cliente_nome),
    }))
  }
  return (
    <AvisosLista
      avisos={initialAvisos}
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
      itensVendaPorVenda={initialItensVenda}
    />
  )
}
