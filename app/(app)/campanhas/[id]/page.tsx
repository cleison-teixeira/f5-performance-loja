export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'
import { buscarCampanha, buscarResultadoCampanha, buscarApuracoesCampanha } from '../actions'
import { CampanhaDetalheClient } from './CampanhaDetalheClient'

export default async function CampanhaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { ctx, role } = appCtx
  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) redirect('/campanhas')
  if (ctx.escopo === 'rede' || !ctx.lojaId) redirect('/campanhas')

  const { id } = await params
  const lojaId = ctx.lojaId
  const podeGerenciar = ['dono', 'gerente', 'admin_f5', 'lider'].includes(role)

  const [campanha, resultado, apuracoes] = await Promise.all([
    buscarCampanha(id, lojaId),
    buscarResultadoCampanha(id, lojaId),
    podeGerenciar ? buscarApuracoesCampanha(id, lojaId) : Promise.resolve([]),
  ])

  if (!campanha) notFound()

  return (
    <CampanhaDetalheClient
      campanha={campanha}
      resultado={resultado}
      apuracoes={apuracoes}
      lojaId={lojaId}
      podeGerenciar={podeGerenciar}
    />
  )
}
