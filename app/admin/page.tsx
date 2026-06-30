export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { AdminClient } from './AdminClient'

export interface LojaRow {
  id: string
  empresa_id: string
  nome: string
  cidade: string | null
  whatsapp: string | null
  ativa: boolean
  admin_only: boolean
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

export interface LiberacaoRow {
  id: string
  email: string
  nome: string | null
  status: string
  role: string
  empresa_nome: string | null
  loja_nome: string | null
  criado_em: string
}

export interface AdminStats {
  total_empresas: number
  total_lojas: number
  total_pendentes: number
  receita_estimada: number
}

export interface MembroLoja {
  membro_id: string
  perfil_id: string
  nome: string | null
  role: string
  ativo: boolean
}

export interface AcessoLoja {
  loja_id: string
  loja_nome: string
  empresa_id: string
  empresa_nome: string
  ativa: boolean
  membros: MembroLoja[]
  pendentes: { id: string; email: string; nome: string | null; role: string }[]
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

  const [empresasRes, lojasRes, planosRes, liberacoesRes] = await Promise.all([
    admin
      .from('empresas')
      .select('id, nome, responsavel_nome, responsavel_whatsapp, responsavel_email, nicho, status, billing_status, plano_id, notas_internas')
      .order('nome'),
    admin
      .from('lojas')
      .select('id, empresa_id, nome, cidade, whatsapp, ativa, admin_only')
      .order('nome'),
    admin
      .from('planos')
      .select('id, nome, slug, max_lojas')
      .eq('ativo', true)
      .order('nome'),
    admin
      .from('liberacoes_acesso')
      .select('id, email, nome, status, role, empresa_id, loja_id, criado_em')
      .order('criado_em', { ascending: false })
      .limit(50),
  ])

  const planosRaw = planosRes.data ?? []
  const planoMap: Record<string, { nome: string; max_lojas: number | null }> = {}
  for (const p of planosRaw) {
    planoMap[p.id as string] = {
      nome: p.nome as string,
      max_lojas: p.max_lojas as number | null,
    }
  }

  const lojasRaw = lojasRes.data ?? []
  const lojaMap: Record<string, string> = {}
  const lojasPorEmpresa: Record<string, LojaRow[]> = {}
  for (const l of lojasRaw) {
    const eid = l.empresa_id as string
    const lojaRow: LojaRow = {
      id: l.id as string,
      empresa_id: eid,
      nome: l.nome as string,
      cidade: l.cidade as string | null,
      whatsapp: l.whatsapp as string | null,
      ativa: l.ativa as boolean,
      admin_only: l.admin_only as boolean,
    }
    if (!lojasPorEmpresa[eid]) lojasPorEmpresa[eid] = []
    lojasPorEmpresa[eid].push(lojaRow)
    lojaMap[l.id as string] = l.nome as string
  }

  const empresasRaw = empresasRes.data ?? []
  const empresaMap: Record<string, string> = {}
  const empresas: EmpresaRow[] = empresasRaw.map(e => {
    empresaMap[e.id as string] = e.nome as string
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
      qtd_lojas: lojas.filter(l => l.ativa && !l.admin_only).length,
      lojas,
    }
  })

  const planos: PlanoOption[] = planosRaw.map(p => ({
    id: p.id as string,
    nome: p.nome as string,
    slug: p.slug as string,
    max_lojas: p.max_lojas as number | null,
  }))

  const liberacoes: LiberacaoRow[] = (liberacoesRes.data ?? []).map(l => ({
    id: l.id as string,
    email: l.email as string,
    nome: l.nome as string | null,
    status: l.status as string,
    role: l.role as string,
    empresa_nome: l.empresa_id ? (empresaMap[l.empresa_id as string] ?? null) : null,
    loja_nome: l.loja_id ? (lojaMap[l.loja_id as string] ?? null) : null,
    criado_em: l.criado_em as string,
  }))

  const totalLojasAtivas = lojasRaw.filter(l => (l.ativa as boolean) && !(l.admin_only as boolean)).length
  const totalPendentes = liberacoes.filter(l => l.status === 'pendente').length

  // Acessos por loja
  const lojasVisiveis = lojasRaw.filter(l => !(l.admin_only as boolean))
  const lojaIdsVisiveis = lojasVisiveis.map(l => l.id as string)

  let acessosPorLoja: AcessoLoja[] = []

  if (lojaIdsVisiveis.length > 0) {
    const { data: membrosData } = await admin
      .from('membros_loja')
      .select('id, loja_id, perfil_id, role, ativo')
      .in('loja_id', lojaIdsVisiveis)

    const perfilIds = [...new Set((membrosData ?? []).map(m => m.perfil_id as string))]
    const nomeMap: Record<string, string | null> = {}
    if (perfilIds.length > 0) {
      const { data: perfisData } = await admin
        .from('perfis')
        .select('id, nome')
        .in('id', perfilIds)
      ;(perfisData ?? []).forEach(p => { nomeMap[p.id as string] = p.nome as string | null })
    }

    const membrosPorLoja: Record<string, MembroLoja[]> = {}
    ;(membrosData ?? []).forEach(m => {
      const lid = m.loja_id as string
      if (!membrosPorLoja[lid]) membrosPorLoja[lid] = []
      membrosPorLoja[lid].push({
        membro_id: m.id as string,
        perfil_id: m.perfil_id as string,
        nome: nomeMap[m.perfil_id as string] ?? null,
        role: m.role as string,
        ativo: m.ativo as boolean,
      })
    })

    const libsPorLoja: Record<string, { id: string; email: string; nome: string | null; role: string }[]> = {}
    ;(liberacoesRes.data ?? []).filter(l => l.status === 'pendente' && l.loja_id).forEach(l => {
      const lid = l.loja_id as string
      if (!libsPorLoja[lid]) libsPorLoja[lid] = []
      libsPorLoja[lid].push({
        id: l.id as string,
        email: l.email as string,
        nome: l.nome as string | null,
        role: l.role as string,
      })
    })

    acessosPorLoja = lojasVisiveis
      .map(l => ({
        loja_id: l.id as string,
        loja_nome: l.nome as string,
        empresa_id: l.empresa_id as string,
        empresa_nome: empresaMap[l.empresa_id as string] ?? '',
        ativa: l.ativa as boolean,
        membros: membrosPorLoja[l.id as string] ?? [],
        pendentes: libsPorLoja[l.id as string] ?? [],
      }))
      .sort((a, b) =>
        a.empresa_nome.localeCompare(b.empresa_nome, 'pt-BR') ||
        a.loja_nome.localeCompare(b.loja_nome, 'pt-BR')
      )
  }

  const stats: AdminStats = {
    total_empresas: empresas.filter(e => !e.lojas.every(l => l.admin_only)).length,
    total_lojas: totalLojasAtivas,
    total_pendentes: totalPendentes,
    receita_estimada: totalLojasAtivas * 149,
  }

  return (
    <AdminClient
      empresas={empresas}
      planos={planos}
      liberacoes={liberacoes}
      stats={stats}
      acessosPorLoja={acessosPorLoja}
    />
  )
}
