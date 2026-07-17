export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminClient } from './AdminClient'

export type AuthStatus = 'confirmed' | 'unconfirmed' | 'no_user' | 'unknown'

export interface LiberacaoRow {
  id: string
  email: string
  nome: string | null
  status: string
  tipo: string
  loja_id: string | null
  loja_nome: string | null
  loja_whatsapp: string | null
  valor_pago: number | null
  prazo_acesso: string | null
  observacao: string | null
  criado_em: string
  empresa_id: string | null
  empresa_status_comercial: string | null
  empresa_data_inicio_cobranca: string | null
  empresa_valor_mensal: number | null
  auth_status: AuthStatus
}

export interface LojaSimples {
  id: string
  nome: string
  empresa_nome: string
  whatsapp: string | null
  email: string | null
}

export interface AdminStats {
  lojas_ativas: number
  lojas_pendentes: number
  redes_ativas: number
  redes_pendentes: number
  receita_estimada: number
  aguardando_confirmacao: number
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

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

  const [lojasRes, empresasRes, liberacoesRes, statsLibRes] = await Promise.all([
    admin
      .from('lojas')
      .select('id, nome, empresa_id, whatsapp')
      .eq('ativa', true)
      .eq('admin_only', false)
      .order('nome'),
    admin
      .from('empresas')
      .select('id, nome, status_comercial, data_inicio_cobranca, valor_mensal'),
    admin
      .from('liberacoes_acesso')
      .select('id, email, nome, status, tipo, loja_id, empresa_id, valor_pago, origem, prazo_acesso, criado_em, observacao')
      .order('criado_em', { ascending: false })
      .limit(50),
    admin
      .from('liberacoes_acesso')
      .select('tipo, status, loja_id, email'),
  ])

  // Auth email confirmation map via RPC (SECURITY DEFINER — acessa auth.users)
  const authEmailMap: Record<string, AuthStatus> = {}
  {
    const uniqueEmails = [
      ...new Set((liberacoesRes.data ?? []).map(l => (l.email as string).toLowerCase().trim()))
    ]
    if (uniqueEmails.length > 0) {
      const { data: authRows, error: authErr } = await admin.rpc(
        'buscar_status_auth_por_emails',
        { p_emails: uniqueEmails }
      )
      if (authErr) {
        console.error('[Admin] buscar_status_auth_por_emails error:', authErr)
        // Falha na consulta: marcar como unknown (não confundir com no_user real)
        uniqueEmails.forEach(email => { authEmailMap[email] = 'unknown' })
      } else {
        // Indexar pelo e-mail retornado (já existe na auth.users)
        const authByEmail: Record<string, string | null> = {}
        for (const row of authRows ?? []) {
          if (row.email) authByEmail[row.email.toLowerCase().trim()] = row.email_confirmed_at ?? null
        }
        for (const email of uniqueEmails) {
          if (email in authByEmail) {
            authEmailMap[email] = authByEmail[email] ? 'confirmed' : 'unconfirmed'
          } else {
            authEmailMap[email] = 'no_user'
          }
        }
      }
    }
  }

  const empresaMap: Record<string, string> = {}
  type EmpresaComercial = { status_comercial: string | null; data_inicio_cobranca: string | null; valor_mensal: number | null }
  const empresaComercialMap: Record<string, EmpresaComercial> = {}
  ;(empresasRes.data ?? []).forEach(e => {
    empresaMap[e.id as string] = e.nome as string
    empresaComercialMap[e.id as string] = {
      status_comercial: (e.status_comercial as string | null) ?? null,
      data_inicio_cobranca: (e.data_inicio_cobranca as string | null) ?? null,
      valor_mensal: (e.valor_mensal as number | null) ?? null,
    }
  })

  const lojaMap: Record<string, string> = {}
  const lojaWhatsappMap: Record<string, string> = {}
  ;(lojasRes.data ?? []).forEach(l => {
    lojaMap[l.id as string] = l.nome as string
    if (l.whatsapp) lojaWhatsappMap[l.id as string] = l.whatsapp as string
  })

  // Busca e-mail associado a cada loja (para pesquisa no seletor Liberar Rede)
  const lojaIds = (lojasRes.data ?? []).map(l => l.id as string)
  const lojaEmailMap: Record<string, string> = {}
  if (lojaIds.length > 0) {
    const { data: emailRows } = await admin
      .from('liberacoes_acesso')
      .select('loja_id, email')
      .in('loja_id', lojaIds)
      .order('criado_em', { ascending: false })
    ;(emailRows ?? []).forEach(row => {
      if (row.loja_id && !lojaEmailMap[row.loja_id as string]) {
        lojaEmailMap[row.loja_id as string] = row.email as string
      }
    })
  }

  const todasLojas: LojaSimples[] = (lojasRes.data ?? []).map(l => ({
    id: l.id as string,
    nome: l.nome as string,
    empresa_nome: empresaMap[l.empresa_id as string] ?? '',
    whatsapp: (l.whatsapp as string | null) ?? null,
    email: lojaEmailMap[l.id as string] ?? null,
  }))

  const allLib = statsLibRes.data ?? []
  const STATUS_ATIVO = ['aplicado', 'ativo']

  const lojasAtivasSet = new Set(
    allLib
      .filter(l => l.tipo === 'loja' && STATUS_ATIVO.includes(l.status as string) && l.loja_id)
      .map(l => l.loja_id as string)
  )
  const lojasPendentesSet = new Set(
    allLib
      .filter(l => l.tipo === 'loja' && l.status === 'pendente' && l.loja_id)
      .map(l => l.loja_id as string)
  )
  const redesAtivasSet = new Set(
    allLib
      .filter(l => l.tipo === 'rede' && STATUS_ATIVO.includes(l.status as string))
      .map(l => (l.email as string).toLowerCase())
  )
  const redesPendentesSet = new Set(
    allLib
      .filter(l => l.tipo === 'rede' && l.status === 'pendente')
      .map(l => (l.email as string).toLowerCase())
  )

  const liberacoes: LiberacaoRow[] = (liberacoesRes.data ?? []).map(l => {
    const empId = (l.empresa_id as string | null) ?? null
    const empComercial = empId ? (empresaComercialMap[empId] ?? null) : null
    return {
      id: l.id as string,
      email: l.email as string,
      nome: l.nome as string | null,
      status: l.status as string,
      tipo: (l.tipo as string | null) ?? 'loja',
      loja_id: (l.loja_id as string | null) ?? null,
      loja_nome: l.loja_id ? (lojaMap[l.loja_id as string] ?? null) : null,
      loja_whatsapp: l.loja_id ? (lojaWhatsappMap[l.loja_id as string] ?? null) : null,
      valor_pago: l.valor_pago as number | null,
      prazo_acesso: l.prazo_acesso as string | null,
      observacao: (l.observacao as string | null) ?? null,
      criado_em: l.criado_em as string,
      empresa_id: empId,
      empresa_status_comercial: empComercial?.status_comercial ?? null,
      empresa_data_inicio_cobranca: empComercial?.data_inicio_cobranca ?? null,
      empresa_valor_mensal: empComercial?.valor_mensal ?? null,
      auth_status: authEmailMap[(l.email as string).toLowerCase()] ?? 'no_user',
    }
  })

  const aguardando_confirmacao = liberacoes.filter(
    l => l.tipo === 'loja' && l.status !== 'cancelado' && l.auth_status === 'unconfirmed'
  ).length

  const stats: AdminStats = {
    lojas_ativas: lojasAtivasSet.size,
    lojas_pendentes: lojasPendentesSet.size,
    redes_ativas: redesAtivasSet.size,
    redes_pendentes: redesPendentesSet.size,
    receita_estimada: lojasAtivasSet.size * 149,
    aguardando_confirmacao,
  }

  return (
    <AdminClient
      liberacoes={liberacoes}
      stats={stats}
      todasLojas={todasLojas}
    />
  )
}
