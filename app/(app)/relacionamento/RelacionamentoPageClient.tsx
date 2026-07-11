'use client'

import { AvisosLista } from '@/app/(app)/avisos/AvisosLista'
import type { AvisoDetalhado } from '@/app/(app)/avisos/types'
import type { VendedoraLoja } from '@/app/(app)/avisos/AvisosLista'

interface Props {
  initialAvisos: AvisoDetalhado[]
  hoje: string
  vendedorasLoja: VendedoraLoja[]
  loja_id: string
  isVendedora: boolean
  mostrarLoja: boolean
}

export function RelacionamentoPageClient({
  initialAvisos,
  hoje,
  vendedorasLoja,
  loja_id,
  isVendedora,
  mostrarLoja,
}: Props) {
  return (
    <AvisosLista
      avisos={initialAvisos}
      hoje={hoje}
      catalogo={[]}
      percentuaisPorVendedora={{}}
      vendedorasLoja={vendedorasLoja}
      loja_id={loja_id}
      isVendedora={isVendedora}
      mode="relacionamento"
      mostrarLoja={mostrarLoja}
    />
  )
}
