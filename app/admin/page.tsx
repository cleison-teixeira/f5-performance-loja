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
  tipo: string
  loja_id: string | null
  loja_nome: string | null
  loja_whatsapp: string | null
  valor_pago: number | null
  prazo_acesso: string | null
  observacao: string | null
  criado_em: string
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
      .select('id, nome'),
    admin
      .from('liberacoes_acesso')
      .select('id, email, nome, status, tipo, loja_id, valor_pago, origem, prazo_acesso, criado_em, observacao')
      .order('criado_em', { ascending: false })
      .limit(50),
    admin
      .from('liberacoes_acesso')
      .select('tipo, status, loja_id, email'),
  ])

  const empresaMap: Record<string, string> = {}
  ;(empresasRes.data ?? []).forEach(e => { empresaMap[e.id as string] = e.nome as string })

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

  const liberacoes: LiberacaoRow[] = (liberacoesRes.data ?? []).map(l => ({
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
  }))

  const stats: AdminStats = {
    lojas_ativas: lojasAtivasSet.size,
    lojas_pendentes: lojasPendentesSet.size,
    redes_ativas: redesAtivasSet.size,
    redes_pendentes: redesPendentesSet.size,
    receita_estimada: lojasAtivasSet.size * 149,
  }

  return (
    <AdminClient
      liberacoes={liberacoes}
      stats={stats}
      todasLojas={todasLojas}
    />
  )
}
