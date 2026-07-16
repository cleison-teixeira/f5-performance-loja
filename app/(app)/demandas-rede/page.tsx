export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { Network, Sparkles } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'
import { DemandasRedeList } from './DemandasRedeList'
import type { DemandaRede } from './actions'

export default async function DemandasRedePage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { user, ctx, role: userRole } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Demandas da Rede</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const admin = createAdminClient()
  const lojaId = ctx.lojaId ?? ctx.lojaIds[0]
  const lojaNome = ctx.lojaNome ?? ''

  // Obter grupo_rede_id da loja atual para filtrar demandas da rede
  const { data: lojaData } = await admin
    .from('lojas')
    .select('grupo_rede_id')
    .eq('id', lojaId)
    .single()

  const grupoRedeId = (lojaData as { grupo_rede_id: string | null } | null)?.grupo_rede_id

  let demandas: DemandaRede[] = []

  if (grupoRedeId) {
    const { data } = await admin
      .from('demandas_rede')
      .select('*, demandas_rede_respostas(*)')
      .eq('grupo_rede_id', grupoRedeId)
      .not('status', 'in', '("resolvido","cancelado")')
      .order('criado_em', { ascending: false })

    demandas = (data ?? []).map(d => ({
      ...(d as unknown as DemandaRede),
      respostas: ((d as unknown as { demandas_rede_respostas: unknown[] }).demandas_rede_respostas ?? []) as DemandaRede['respostas'],
    }))
  }

  // Nome do usuário para exibição nas respostas
  const { data: perfil } = await admin
    .from('perfis')
    .select('nome')
    .eq('id', user.id)
    .maybeSingle()

  const userNome = (perfil as { nome: string } | null)?.nome ?? user.email ?? ''

  const qtdEmBusca = demandas.filter(d => d.status === 'em_busca').length
  const qtdRespondidas = demandas.filter(d => d.status === 'encontrado' || d.status === 'separado').length

  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${ctx.lojas.length} lojas conectadas`
    : `${lojaNome} · Demandas abertas entre lojas`

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-semibold">Demandas da Rede</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            Nova funcionalidade em validação
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </div>

      {demandas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{qtdEmBusca}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Em busca</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{qtdRespondidas}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Com resposta</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{demandas.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total em aberto</p>
          </div>
        </div>
      )}

      {demandas.length > 0 && qtdEmBusca > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-none shadow-sm mt-0.5">
            <Network className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Rede</p>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-0.5">
              {qtdEmBusca} demanda{qtdEmBusca !== 1 ? 's' : ''} aguardando resposta
            </p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
              {ctx.escopo === 'loja' ? 'Outras lojas podem ter o produto disponível.' : 'Selecione uma loja para poder responder.'}
            </p>
          </div>
        </div>
      )}

      <DemandasRedeList
        demandas={demandas}
        lojaId={ctx.escopo === 'loja' ? lojaId : null}
        lojaIds={ctx.lojaIds}
        lojaNome={lojaNome}
        userNome={userNome}
        escopo={ctx.escopo}
      />
    </div>
  )
}
