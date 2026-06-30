export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminF5Client } from './AdminF5Client'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export interface LojaRow {
  id: string
  empresa_id: string
  nome: string
  cidade: string | null
  whatsapp: string | null
  ativa: boolean
}

export interface EmpresaRow {
  id: string
  nome: string
  responsavel_nome: string | null
  responsavel_whatsapp: string | null
  responsavel_email: string | null
  nicho: string | null
  status: string
  billing_status: string | null
  plano_id: string | null
  plano_nome: string | null
  plano_max_lojas: number | null
  notas_internas: string | null
  qtd_lojas: number
  lojas: LojaRow[]
}

export interface PlanoOption {
  id: string
  nome: string
  slug: string
  max_lojas: number | null
}

export default async function AdminF5Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: todosMembros } = await admin
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  const role = todosMembros && todosMembros.length > 0
    ? todosMembros.reduce((best: string, m) => {
        const mRole = m.role as string
        return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
      }, todosMembros[0].role as string)
    : null

  if (role !== 'admin_f5') redirect('/dashboard')

  const [empresasRes, lojasRes, planosRes] = await Promise.all([
    admin
      .from('empresas')
      .select('id, nome, responsavel_nome, responsavel_whatsapp, responsavel_email, nicho, status, billing_status, plano_id, notas_internas')
      .order('nome'),
    admin
      .from('lojas')
      .select('id, empresa_id, nome, cidade, whatsapp, ativa')
      .order('nome'),
    admin
      .from('planos')
      .select('id, nome, slug, max_lojas')
      .eq('ativo', true)
      .order('nome'),
  ])

  const planosRaw = planosRes.data ?? []
  const planoMap: Record<string, { nome: string; max_lojas: number | null }> = {}
  for (const p of planosRaw) {
    planoMap[p.id as string] = {
      nome: p.nome as string,
      max_lojas: p.max_lojas as number | null,
    }
  }

  const lojasPorEmpresa: Record<string, LojaRow[]> = {}
  for (const l of lojasRes.data ?? []) {
    const eid = l.empresa_id as string
    if (!lojasPorEmpresa[eid]) lojasPorEmpresa[eid] = []
    lojasPorEmpresa[eid].push({
      id: l.id as string,
      empresa_id: eid,
      nome: l.nome as string,
      cidade: l.cidade as string | null,
      whatsapp: l.whatsapp as string | null,
      ativa: l.ativa as boolean,
    })
  }

  const empresas: EmpresaRow[] = (empresasRes.data ?? []).map(e => {
    const lojas = lojasPorEmpresa[e.id as string] ?? []
    const planoId = e.plano_id as string | null
    const planoInfo = planoId ? planoMap[planoId] : null
    return {
      id: e.id as string,
      nome: e.nome as string,
      responsavel_nome: e.responsavel_nome as string | null,
      responsavel_whatsapp: e.responsavel_whatsapp as string | null,
      responsavel_email: e.responsavel_email as string | null,
      nicho: e.nicho as string | null,
      status: e.status as string,
      billing_status: e.billing_status as string | null,
      plano_id: planoId,
      plano_nome: planoInfo?.nome ?? null,
      plano_max_lojas: planoInfo?.max_lojas ?? null,
      notas_internas: e.notas_internas as string | null,
      qtd_lojas: lojas.filter(l => l.ativa).length,
      lojas,
    }
  })

  const planos: PlanoOption[] = planosRaw.map(p => ({
    id: p.id as string,
    nome: p.nome as string,
    slug: p.slug as string,
    max_lojas: p.max_lojas as number | null,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Admin F5</h1>
        <p className="text-sm text-muted-foreground">Gestão de empresas, lojas e acessos.</p>
      </div>
      <AdminF5Client empresas={empresas} planos={planos} />
    </div>
  )
}
