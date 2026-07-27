export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'
import { buscarCampanha, buscarMembrosLoja } from '../../actions'
import { NovaCampanhaWizard } from '../../nova/NovaCampanhaWizard'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function EditarCampanhaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { ctx, role } = appCtx

  if (!['dono', 'gerente', 'admin_f5', 'lider'].includes(role)) redirect('/campanhas')
  if (ctx.escopo === 'rede' || !ctx.lojaId) redirect('/campanhas')

  const { id } = await params
  const lojaId = ctx.lojaId

  const campanha = await buscarCampanha(id, lojaId)
  if (!campanha) redirect('/campanhas')
  if (['encerrada', 'cancelada'].includes(campanha.status)) {
    redirect(`/campanhas/${id}`)
  }

  const admin = createAdminClient()
  const { data: produtos } = await admin
    .from('produtos')
    .select('id, nome, preco_sugerido, foto_url, recorrente')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .order('nome')

  const membros = await buscarMembrosLoja(lojaId)

  return (
    <NovaCampanhaWizard
      lojaId={lojaId}
      lojaNome={ctx.lojaNome}
      tipoInicial={campanha.tipo}
      produtos={(produtos ?? []) as Array<{
        id: string
        nome: string
        preco_sugerido: number | null
        foto_url: string | null
        recorrente: boolean
      }>}
      membros={membros}
      campanhaId={id}
      campanhaInicial={campanha}
    />
  )
}
