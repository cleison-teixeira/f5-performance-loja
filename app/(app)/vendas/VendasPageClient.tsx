'use client'

import { VendasLista } from './VendasLista'
import type { VendaExtrato } from './page'

interface Props {
  initialVendas: VendaExtrato[]
  isVendedora: boolean
  vendedoras: { id: string; nome: string }[]
  mostrarLoja: boolean
}

export function VendasPageClient({
  initialVendas,
  isVendedora,
  vendedoras,
  mostrarLoja,
}: Props) {
  return (
    <VendasLista vendas={initialVendas} isVendedora={isVendedora} vendedoras={vendedoras} mostrarLoja={mostrarLoja} />
  )
}
