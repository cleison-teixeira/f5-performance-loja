export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminClient } from './AdminClient'

export interface LiberacaoRow {
  id: string
  email: string
  nome: string | null
  status: string
  loja_nome: string | null
  loja_whatsapp: string | null
  valor_pago: number | null
  prazo_acesso: string | null
  criado_em: string
}

export interface LojaSimples {
  id: string
  nome: string
  empresa_nome: string
}

export interface AdminStats {
  total_lojas: number
  total_pendentes: number
  receita_estimada: number
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

  const [lojasRes, empresasRes, liberacoesRes] = await Promise.all([
    admin
      .from('lojas')
      .select('id, nome, empresa_id, whatsapp')
      .eq('ativa', true)
      .eq('admin_only', false)
      .order('nome'),
    admin
      .from('empresas')
      .select('id, nome'),
    admin
      .from('liberacoes_acesso')
      .select('id, email, nome, status, loja_id, valor_pago, origem, prazo_acesso, criado_em')
      .order('criado_em', { ascending: false })
      .limit(30),
  ])

  const empresaMap: Record<string, string> = {}
  ;(empresasRes.data ?? []).forEach(e => { empresaMap[e.id as string] = e.nome as string })

  const lojaMap: Record<string, string> = {}
  const lojaWhatsappMap: Record<string, string> = {}
  ;(lojasRes.data ?? []).forEach(l => {
    lojaMap[l.id as string] = l.nome as string
    if (l.whatsapp) lojaWhatsappMap[l.id as string] = l.whatsapp as string
  })

  const todasLojas: LojaSimples[] = (lojasRes.data ?? []).map(l => ({
    id: l.id as string,
    nome: l.nome as string,
    empresa_nome: empresaMap[l.empresa_id as string] ?? '',
  }))

  const totalLojasAtivas = (lojasRes.data ?? []).length
  const totalPendentes = (liberacoesRes.data ?? []).filter(l => l.status === 'pendente').length

  const liberacoes: LiberacaoRow[] = (liberacoesRes.data ?? []).map(l => ({
    id: l.id as string,
    email: l.email as string,
    nome: l.nome as string | null,
    status: l.status as string,
    loja_nome: l.loja_id ? (lojaMap[l.loja_id as string] ?? null) : null,
    loja_whatsapp: l.loja_id ? (lojaWhatsappMap[l.loja_id as string] ?? null) : null,
    valor_pago: l.valor_pago as number | null,
    prazo_acesso: l.prazo_acesso as string | null,
    criado_em: l.criado_em as string,
  }))

  const stats: AdminStats = {
    total_lojas: totalLojasAtivas,
    total_pendentes: totalPendentes,
    receita_estimada: totalLojasAtivas * 149,
  }

  return (
    <AdminClient
      liberacoes={liberacoes}
      stats={stats}
      todasLojas={todasLojas}
    />
  )
}
