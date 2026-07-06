export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdocaoClient } from './AdocaoClient'

export interface MetaAdocao {
  id: string | null
  loja_id: string
  vendas_mes_estimadas: number | null
  percentual_recorrente_estimado: number | null
  meta_recorrentes_mes: number | null
  ticket_medio_estimado: number | null
  responsavel_loja_nome: string | null
  responsavel_loja_whatsapp: string | null
  origem_meta: string
  data_inicio_acompanhamento: string | null
  observacoes: string | null
  status: string
}

export interface MetricasLoja {
  loja_id: string
  cadastradas_mes: number
  cadastradas_hoje: number
  oportunidades_abertas: number
  avisos_pendentes: number
  avisos_atrasados: number
  recompras_qtd: number
  recompras_valor: number
  perdas_qtd: number
}

export interface InfoFinanceira {
  billing_status: string        // de empresas.billing_status
  trial_ends_at: string | null  // de empresas.trial_ends_at
  valor_pago: number | null     // de liberacoes_acesso.valor_pago
  prazo_acesso: string | null   // de liberacoes_acesso.prazo_acesso (DATE)
  plano_nome: string | null     // de planos.nome via liberacoes_acesso.plano_id
  liberacao_status: string | null // de liberacoes_acesso.status
}

export interface LojaAdocao {
  id: string
  nome: string
  empresa_nome: string
  whatsapp: string | null
  documento: string | null
  meta: MetaAdocao | null
  metricas: MetricasLoja
  financeiro: InfoFinanceira | null
}

export default async function AdocaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/adocao')

  const admin = createAdminClient()

  const { data: adminMembro } = await admin
    .from('membros_loja')
    .select('id')
    .eq('perfil_id', user.id)
    .eq('role', 'admin_f5')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (!adminMembro) redirect('/dashboard')

  const hoje = new Date().toISOString().split('T')[0]
  const inicioMes = hoje.slice(0, 7) + '-01'
  const inicioMesTs = inicioMes + 'T00:00:00Z'
  const hojeTs = hoje + 'T00:00:00Z'

  const [
    lojasRes, empresasRes, metasRes,
    cadastradasMesRes, cadastradasHojeRes,
    oportunidadesRes, avisosAtivosRes,
    recomprasRes, perdasRes,
    libRes, planosRes,
  ] = await Promise.all([
    // Inclui billing_status e trial_ends_at via join com empresas
    admin.from('lojas').select('id, nome, empresa_id, whatsapp, documento, empresas(billing_status, trial_ends_at)')
      .eq('ativa', true).eq('admin_only', false).order('nome'),
    admin.from('empresas').select('id, nome'),
    admin.from('lojas_metas_adocao').select('*'),

    // Cadastros recorrentes no mês: itens_venda.recorrente=true + loja via vendas
    admin.from('itens_venda')
      .select('id, vendas!inner(loja_id)')
      .eq('recorrente', true)
      .gte('criado_em', inicioMesTs),

    // Cadastros recorrentes hoje
    admin.from('itens_venda')
      .select('id, vendas!inner(loja_id)')
      .eq('recorrente', true)
      .gte('criado_em', hojeTs),

    // Oportunidades abertas (status ativos) — deduplica por item_venda_id no cliente
    admin.from('avisos').select('loja_id, item_venda_id, id')
      .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)'),

    // Avisos com status ativo (para contar pendentes vs atrasados)
    admin.from('avisos').select('loja_id, data_aviso')
      .in('status', ['pendente', 'aberta', 'contato_feito', 'reagendada']),

    // Recompras confirmadas no mês
    admin.from('recompras').select('loja_id, valor_total')
      .not('venda_id', 'is', null)
      .gte('criado_em', inicioMesTs),

    // Perdas no mês — deduplica por item_venda_id no cliente
    admin.from('avisos').select('loja_id, item_venda_id, id')
      .eq('status', 'perdida')
      .gte('encerrado_em', inicioMesTs),

    // Liberações por loja — fonte do status financeiro (mais recente por loja)
    admin.from('liberacoes_acesso')
      .select('loja_id, status, valor_pago, prazo_acesso, plano_id, criado_em')
      .not('loja_id', 'is', null)
      .eq('tipo', 'loja')
      .order('criado_em', { ascending: false }),

    // Planos cadastrados
    admin.from('planos').select('id, nome, preco_mensal').eq('ativo', true),
  ])

  // Agregar métricas por loja_id
  const cadastradasMesPorLoja = new Map<string, number>()
  const cadastradasHojePorLoja = new Map<string, number>()
  const oportunidadesPorLoja = new Map<string, Set<string>>()
  const pendentesPorLoja = new Map<string, number>()
  const atrasadosPorLoja = new Map<string, number>()
  const recomprasQtdPorLoja = new Map<string, number>()
  const recomprasValorPorLoja = new Map<string, number>()
  const perdasPorLoja = new Map<string, Set<string>>()

  for (const row of cadastradasMesRes.data ?? []) {
    const v = (row as unknown as { vendas: { loja_id: string } }).vendas
    if (!v?.loja_id) continue
    cadastradasMesPorLoja.set(v.loja_id, (cadastradasMesPorLoja.get(v.loja_id) ?? 0) + 1)
  }
  for (const row of cadastradasHojeRes.data ?? []) {
    const v = (row as unknown as { vendas: { loja_id: string } }).vendas
    if (!v?.loja_id) continue
    cadastradasHojePorLoja.set(v.loja_id, (cadastradasHojePorLoja.get(v.loja_id) ?? 0) + 1)
  }
  for (const row of oportunidadesRes.data ?? []) {
    const lojaId = row.loja_id as string
    if (!oportunidadesPorLoja.has(lojaId)) oportunidadesPorLoja.set(lojaId, new Set())
    oportunidadesPorLoja.get(lojaId)!.add((row.item_venda_id as string | null) ?? (row.id as string))
  }
  for (const row of avisosAtivosRes.data ?? []) {
    const lojaId = row.loja_id as string
    if ((row.data_aviso as string) < hoje) {
      atrasadosPorLoja.set(lojaId, (atrasadosPorLoja.get(lojaId) ?? 0) + 1)
    } else {
      pendentesPorLoja.set(lojaId, (pendentesPorLoja.get(lojaId) ?? 0) + 1)
    }
  }
  for (const row of recomprasRes.data ?? []) {
    const lojaId = row.loja_id as string
    recomprasQtdPorLoja.set(lojaId, (recomprasQtdPorLoja.get(lojaId) ?? 0) + 1)
    recomprasValorPorLoja.set(lojaId, (recomprasValorPorLoja.get(lojaId) ?? 0) + ((row.valor_total as number) ?? 0))
  }
  for (const row of perdasRes.data ?? []) {
    const lojaId = row.loja_id as string
    if (!perdasPorLoja.has(lojaId)) perdasPorLoja.set(lojaId, new Set())
    perdasPorLoja.get(lojaId)!.add((row.item_venda_id as string | null) ?? (row.id as string))
  }

  const empresaMap = new Map((empresasRes.data ?? []).map(e => [e.id as string, e.nome as string]))
  const metaMap = new Map((metasRes.data ?? []).map(m => [m.loja_id as string, m]))

  // Mapa de planos: id → { nome, preco_mensal }
  const planosMap = new Map((planosRes.data ?? []).map(p => [
    p.id as string,
    { nome: p.nome as string, preco_mensal: p.preco_mensal as number | null },
  ]))

  // Liberação mais recente (tipo='loja') por loja_id — array já vem ordenado DESC por criado_em
  type LibRow = { loja_id: string; status: string; valor_pago: number | null; prazo_acesso: string | null; plano_id: string | null }
  const liberacaoMap = new Map<string, LibRow>()
  for (const lib of (libRes.data ?? []) as unknown as LibRow[]) {
    if (!lib.loja_id || liberacaoMap.has(lib.loja_id)) continue
    liberacaoMap.set(lib.loja_id, lib)
  }

  const lojas: LojaAdocao[] = (lojasRes.data ?? []).map(l => {
    const lojaId = l.id as string
    const metaRaw = metaMap.get(lojaId) ?? null

    // Dados financeiros: empresas (via join) + liberacoes_acesso
    const empresaJoin = (l as unknown as { empresas: { billing_status: string; trial_ends_at: string | null } | null }).empresas
    const lib = liberacaoMap.get(lojaId) ?? null
    const financeiro: InfoFinanceira | null = empresaJoin ? {
      billing_status: empresaJoin.billing_status ?? 'trial',
      trial_ends_at: empresaJoin.trial_ends_at ?? null,
      valor_pago: lib?.valor_pago ?? null,
      prazo_acesso: lib?.prazo_acesso ?? null,
      plano_nome: lib?.plano_id ? (planosMap.get(lib.plano_id)?.nome ?? null) : null,
      liberacao_status: lib?.status ?? null,
    } : null

    return {
      id: lojaId,
      nome: l.nome as string,
      empresa_nome: empresaMap.get(l.empresa_id as string) ?? '',
      whatsapp: (l.whatsapp as string | null) ?? null,
      documento: (l.documento as string | null) ?? null,
      financeiro,
      meta: metaRaw ? {
        id: metaRaw.id as string,
        loja_id: lojaId,
        vendas_mes_estimadas: (metaRaw.vendas_mes_estimadas as number | null),
        percentual_recorrente_estimado: (metaRaw.percentual_recorrente_estimado as number | null),
        meta_recorrentes_mes: (metaRaw.meta_recorrentes_mes as number | null),
        ticket_medio_estimado: (metaRaw.ticket_medio_estimado as number | null),
        responsavel_loja_nome: (metaRaw.responsavel_loja_nome as string | null),
        responsavel_loja_whatsapp: (metaRaw.responsavel_loja_whatsapp as string | null),
        origem_meta: (metaRaw.origem_meta as string) ?? 'manual',
        data_inicio_acompanhamento: (metaRaw.data_inicio_acompanhamento as string | null),
        observacoes: (metaRaw.observacoes as string | null),
        status: (metaRaw.status as string) ?? 'ativo',
      } : null,
      metricas: {
        loja_id: lojaId,
        cadastradas_mes: cadastradasMesPorLoja.get(lojaId) ?? 0,
        cadastradas_hoje: cadastradasHojePorLoja.get(lojaId) ?? 0,
        oportunidades_abertas: oportunidadesPorLoja.get(lojaId)?.size ?? 0,
        avisos_pendentes: pendentesPorLoja.get(lojaId) ?? 0,
        avisos_atrasados: atrasadosPorLoja.get(lojaId) ?? 0,
        recompras_qtd: recomprasQtdPorLoja.get(lojaId) ?? 0,
        recompras_valor: recomprasValorPorLoja.get(lojaId) ?? 0,
        perdas_qtd: perdasPorLoja.get(lojaId)?.size ?? 0,
      },
    }
  })

  return (
    <div className="min-h-screen bg-zinc-100 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Central de Adoção</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Acompanhamento loja a loja — execução e metas de cadastro recorrente
          </p>
        </div>
        <AdocaoClient lojas={lojas} hoje={hoje} />
      </div>
    </div>
  )
}
