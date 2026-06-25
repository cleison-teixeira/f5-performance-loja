import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { TabelaEquipe } from './TabelaEquipe'
import { SeletorLoja } from './SeletorLoja'

export interface MembroExibido {
  membro_id: string
  perfil_id: string
  nome: string
  email: string
  telefone: string
  role: string
  ativo: boolean
  percentual_comissao: number
}

export default async function ConfigEquipePage({
  searchParams,
}: {
  searchParams: Promise<{ loja_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client to fetch ALL active lojas for this user — avoids RLS ordering
  // issues that caused .limit(1) to return the wrong role for multi-loja donos.
  const admin = createAdminClient()
  const { data: todosMembros } = await admin
    .from('membros_loja')
    .select('loja_id, role, lojas(id, nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  if (!todosMembros || todosMembros.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  // Derive effective role: dono/admin_f5 beats gerente beats vendedora
  const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }
  const userRole = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(userRole)
  const multiLoja = !isAcessoLoja(userRole)

  // Build deduplicated loja list preserving insertion order
  type LojaOpcao = { id: string; nome: string }
  const seen = new Set<string>()
  const lojasDisponiveis: LojaOpcao[] = []
  for (const m of todosMembros) {
    const l = m.lojas as unknown as LojaOpcao | Array<LojaOpcao> | null
    const lojaItem = Array.isArray(l) ? l[0] : l
    if (lojaItem && !seen.has(lojaItem.id)) {
      seen.add(lojaItem.id)
      lojasDisponiveis.push({ id: lojaItem.id, nome: lojaItem.nome })
    }
  }

  // Resolve selected loja: searchParam → validate membership → fallback to first
  const { loja_id: lojaIdParam } = await searchParams
  const loja_id = (lojaIdParam && lojasDisponiveis.some(l => l.id === lojaIdParam))
    ? lojaIdParam
    : lojasDisponiveis[0].id

  const lojaNome = lojasDisponiveis.find(l => l.id === loja_id)?.nome ?? ''

  // Members for selected loja
  const { data: membros } = await admin
    .from('membros_loja')
    .select('id, role, ativo, perfil_id, perfis(nome, whatsapp)')
    .eq('loja_id', loja_id)
    .order('role')

  // Emails from Auth
  const { data: authData } = await admin.auth.admin.listUsers()
  const emailPorId: Record<string, string> = {}
  for (const u of authData?.users ?? []) {
    emailPorId[u.id] = u.email ?? ''
  }

  // Comissões (kept for data completeness, not shown in UI)
  const { data: regrasData } = await admin
    .from('regras_comissao')
    .select('vendedora_id, percentual')
    .eq('loja_id', loja_id)
    .eq('ativo', true)
  const comissaoPorId: Record<string, number> = Object.fromEntries(
    (regrasData ?? []).map(r => [r.vendedora_id as string, r.percentual as number])
  )

  const membrosExibidos: MembroExibido[] = (membros ?? []).map(m => {
    const p = m.perfis as unknown as { nome: string; whatsapp: string | null } | Array<{ nome: string; whatsapp: string | null }>
    const perfil = Array.isArray(p) ? p[0] : p
    return {
      membro_id: m.id as string,
      perfil_id: m.perfil_id as string,
      nome: perfil?.nome ?? '',
      email: emailPorId[m.perfil_id as string] ?? '',
      telefone: perfil?.whatsapp ?? '',
      role: m.role as string,
      ativo: m.ativo as boolean,
      percentual_comissao: comissaoPorId[m.perfil_id as string] ?? 0,
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground">{lojaNome}</p>
        </div>
        {multiLoja && lojasDisponiveis.length > 1 && (
          <SeletorLoja lojas={lojasDisponiveis} lojaAtiva={loja_id} />
        )}
      </div>
      <TabelaEquipe
        membros={membrosExibidos}
        loja_id={loja_id}
        podeEditar={podeEditar}
        userRole={userRole}
        currentUserId={user.id}
      />
    </div>
  )
}
