import { createAdminClient } from '@/lib/supabase/admin'
import type { Notificacao, NotificacoesResult } from './types'

const VAZIO: NotificacoesResult = { notificacoes: [], badgesMap: {} }

export async function getNotificacoes(params: {
  isAdminF5: boolean
  lojaIds: string[]
  hoje: string
}): Promise<NotificacoesResult> {
  const { isAdminF5, lojaIds, hoje } = params

  try {
    const admin = createAdminClient()

    if (isAdminF5) {
      return await buildAdminNotificacoes(admin, hoje)
    }

    if (lojaIds.length === 0) return VAZIO

    return await buildLojaNotificacoes(admin, lojaIds, hoje)
  } catch {
    return VAZIO
  }
}

// ── Notificações para usuários de loja (dono/gerente/vendedora) ───────────────

const TIPOS_FILA = ['recompra', 'oferta', 'follow_up', 'confirmação']
const TIPOS_RELACIONAMENTO = ['agradecimento', 'relacionamento']

async function buildLojaNotificacoes(
  admin: ReturnType<typeof createAdminClient>,
  lojaIds: string[],
  hoje: string,
): Promise<NotificacoesResult> {
  const [avisosRes, listaEsperaRes] = await Promise.all([
    admin
      .from('avisos')
      .select('id, data_aviso, status, recompra_id, mensagens_produto(tipo)')
      .in('loja_id', lojaIds)
      .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)'),
    admin
      .from('lista_espera')
      .select('id')
      .in('loja_id', lojaIds)
      .eq('status', 'aguardando'),
  ])

  type AvisoRaw = { id: string; data_aviso: string; status: string; recompra_id: string | null; mensagens_produto: { tipo: string }[] | null }
  const getTipo = (a: AvisoRaw) => (Array.isArray(a.mensagens_produto) ? a.mensagens_produto[0]?.tipo : null) ?? ''

  const avisosRaw = (avisosRes.data ?? []) as unknown as AvisoRaw[]
  const avisosFila = avisosRaw.filter(a => TIPOS_FILA.includes(getTipo(a)))
  const avisosRel = avisosRaw.filter(a => {
    if (!TIPOS_RELACIONAMENTO.includes(getTipo(a))) return false
    if (a.status === 'contato_feito') return false
    if (a.status === 'enviado' && !a.recompra_id) return false
    return true
  })

  const filaAtrasados = avisosFila.filter(a => (a.data_aviso as string) < hoje).length
  const filaHoje = avisosFila.filter(a => (a.data_aviso as string) === hoje).length
  const relAtrasados = avisosRel.filter(a => (a.data_aviso as string) < hoje).length
  const relHoje = avisosRel.filter(a => (a.data_aviso as string) === hoje).length
  const listaCount = listaEsperaRes.data?.length ?? 0

  const notificacoes: Notificacao[] = []

  if (filaAtrasados > 0) {
    notificacoes.push({
      id: `fila-atrasados-${hoje}`,
      tipo: 'avisos_atrasados',
      titulo: `${filaAtrasados} aviso${filaAtrasados > 1 ? 's' : ''} de recompra atrasado${filaAtrasados > 1 ? 's' : ''}`,
      descricao: 'Clientes aguardando contato com data já passada.',
      url: '/avisos',
      severidade: 'critico',
    })
  }

  if (filaHoje > 0) {
    notificacoes.push({
      id: `fila-hoje-${hoje}`,
      tipo: 'avisos_hoje',
      titulo: `${filaHoje} aviso${filaHoje > 1 ? 's' : ''} de recompra para hoje`,
      descricao: `${filaHoje === 1 ? 'Um cliente precisa' : `${filaHoje} clientes precisam`} ser abordado${filaHoje > 1 ? 's' : ''} hoje.`,
      url: '/avisos',
      severidade: 'atencao',
    })
  }

  if (relAtrasados > 0) {
    notificacoes.push({
      id: `rel-atrasados-${hoje}`,
      tipo: 'relacionamento_atrasados',
      titulo: `${relAtrasados} relacionamento${relAtrasados > 1 ? 's' : ''} atrasado${relAtrasados > 1 ? 's' : ''}`,
      descricao: 'Mensagens de relacionamento com data já passada.',
      url: '/relacionamento',
      severidade: 'critico',
    })
  }

  if (relHoje > 0) {
    notificacoes.push({
      id: `rel-hoje-${hoje}`,
      tipo: 'relacionamento_hoje',
      titulo: `${relHoje} relacionamento${relHoje > 1 ? 's' : ''} para hoje`,
      descricao: `${relHoje === 1 ? 'Um cliente precisa' : `${relHoje} clientes precisam`} de atenção hoje.`,
      url: '/relacionamento',
      severidade: 'atencao',
    })
  }

  if (listaCount > 0) {
    notificacoes.push({
      id: `lista-espera-${hoje}`,
      tipo: 'lista_espera',
      titulo: `${listaCount} ite${listaCount > 1 ? 'ns' : 'm'} na lista de espera`,
      descricao: `Cliente${listaCount > 1 ? 's' : ''} aguardando produto disponível.`,
      url: '/lista-espera',
      severidade: 'atencao',
    })
  }

  return {
    notificacoes,
    badgesMap: {
      '/avisos': filaAtrasados + filaHoje,
      '/relacionamento': relAtrasados + relHoje,
      '/lista-espera': listaCount,
    },
  }
}

// ── Notificações para Admin F5 ────────────────────────────────────────────────

async function buildAdminNotificacoes(
  admin: ReturnType<typeof createAdminClient>,
  hoje: string,
): Promise<NotificacoesResult> {
  const [lojasRes, metasRes, avisosAtrasadosRes] = await Promise.all([
    admin
      .from('lojas')
      .select('id, nome')
      .eq('ativa', true)
      .eq('admin_only', false),
    admin
      .from('lojas_metas_adocao')
      .select('loja_id, meta_recorrentes_mes'),
    admin
      .from('avisos')
      .select('loja_id')
      .in('status', ['pendente', 'aberta', 'contato_feito', 'reagendada'])
      .lt('data_aviso', hoje),
  ])

  const lojas = lojasRes.data ?? []
  const metaSet = new Set(
    (metasRes.data ?? [])
      .filter(m => m.meta_recorrentes_mes)
      .map(m => m.loja_id as string),
  )

  const semMeta = lojas.filter(l => !metaSet.has(l.id as string))

  const atrasadosPorLoja = new Map<string, number>()
  for (const a of avisosAtrasadosRes.data ?? []) {
    const lid = a.loja_id as string
    atrasadosPorLoja.set(lid, (atrasadosPorLoja.get(lid) ?? 0) + 1)
  }
  const lojasComAtrasados = lojas.filter(l => (atrasadosPorLoja.get(l.id as string) ?? 0) >= 5)

  const notificacoes: Notificacao[] = []

  if (semMeta.length > 0) {
    const nomes = semMeta.slice(0, 2).map(l => l.nome as string).join(', ')
    const extra = semMeta.length > 2 ? ` +${semMeta.length - 2}` : ''
    notificacoes.push({
      id: `admin-sem-meta-${hoje}`,
      tipo: 'admin_sem_meta',
      titulo: `${semMeta.length} loja${semMeta.length > 1 ? 's' : ''} sem meta`,
      descricao: `${nomes}${extra} sem meta de adoção configurada.`,
      url: '/admin/adocao',
      severidade: 'atencao',
    })
  }

  if (lojasComAtrasados.length > 0) {
    notificacoes.push({
      id: `admin-avisos-atrasados-${hoje}`,
      tipo: 'admin_avisos_atrasados',
      titulo: `${lojasComAtrasados.length} loja${lojasComAtrasados.length > 1 ? 's' : ''} com avisos atrasados`,
      descricao: 'Lojas com 5 ou mais avisos acumulados sem contato.',
      url: '/admin/adocao',
      severidade: 'critico',
    })
  }

  return { notificacoes, badgesMap: {} }
}
