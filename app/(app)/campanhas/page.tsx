export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'
import { buscarCampanhasLoja } from './actions'
import { CampanhasPageClient } from './CampanhasPageClient'

export default async function CampanhasPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { ctx, role } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Campanhas de Venda</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  if (ctx.escopo === 'rede' || !ctx.lojaId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Campanhas de Venda</h1>
        <p className="text-sm text-muted-foreground">Selecione uma loja para ver as campanhas.</p>
      </div>
    )
  }

  const lojaId = ctx.lojaId
  const podeGerenciar = ['dono', 'gerente', 'admin_f5', 'lider'].includes(role)

  const campanhas = await buscarCampanhasLoja(lojaId)

  return (
    <CampanhasPageClient
      campanhas={campanhas}
      lojaId={lojaId}
      lojaNome={ctx.lojaNome}
      podeGerenciar={podeGerenciar}
    />
  )
}
