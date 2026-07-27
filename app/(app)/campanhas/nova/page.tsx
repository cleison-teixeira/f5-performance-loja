export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'
import { buscarMembrosLoja } from '../actions'
import { NovaCampanhaWizard } from './NovaCampanhaWizard'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TipoCampanha } from '../types'

const TIPOS_VALIDOS: TipoCampanha[] = ['acao_granel', 'produto_mes', 'lancamento', 'desafio_vendas']

export default async function NovaCampanhaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { ctx, role } = appCtx

  if (!['dono', 'gerente', 'admin_f5', 'lider'].includes(role)) redirect('/campanhas')
  if (ctx.escopo === 'rede' || !ctx.lojaId) redirect('/campanhas')

  const lojaId = ctx.lojaId
  const params = await searchParams
  const tipoRaw = params.tipo
  const tipoInicial: TipoCampanha = TIPOS_VALIDOS.includes(tipoRaw as TipoCampanha)
    ? (tipoRaw as TipoCampanha)
    : 'acao_granel'

  const admin = createAdminClient()

  // Carregar produtos ativos da loja
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
      tipoInicial={tipoInicial}
      produtos={(produtos ?? []) as Array<{
        id: string
        nome: string
        preco_sugerido: number | null
        foto_url: string | null
        recorrente: boolean
      }>}
      membros={membros}
    />
  )
}
