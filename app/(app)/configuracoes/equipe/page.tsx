export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getMembrosAtivos, getContextoLoja } from '@/lib/loja/contexto'
import { TabelaEquipe } from './TabelaEquipe'
import { PinGestaoGuard } from '@/components/pin/PinGestaoGuard'

export interface MembroExibido {
  membro_id: string
  perfil_id: string
  nome: string
  telefone: string
  role: string
  ativo: boolean
  percentual_comissao: number
  pin_ativo: boolean
  tem_pin_hash: boolean
  avatar_url: string | null
  observacao_interna: string | null
}

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function ConfigEquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const todosMembros = await getMembrosAtivos(user.id)

  if (todosMembros.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const userRole = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  if (userRole === 'vendedora') redirect('/dashboard')

  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(userRole)
  const multiLoja = !isAcessoLoja(userRole)
  const ctx = await getContextoLoja(user.id, multiLoja)

  const loja_id = ctx.lojaId ?? ctx.lojas[0]?.id ?? null
  const lojaNome = ctx.lojaId ? ctx.lojaNome : (ctx.lojas[0]?.nome ?? '')

  if (!loja_id) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  // Guard PIN: somente Acesso Loja. admin_f5 e dono com rede passam direto.
  let guardLojaId: string | null = null
  if (userRole !== 'admin_f5') {
    if (!multiLoja) {
      // gerente: sempre Acesso Loja
      guardLojaId = loja_id
    } else {
      // dono: verificar se tem acesso rede (multi-loja)
      const { data: libCheck } = await admin
        .from('liberacoes_acesso')
        .select('tipo, status')
        .eq('email', (user.email ?? '').toLowerCase())
        .in('status', ['aplicado', 'ativo'])
      const isRede = (libCheck ?? []).some(l => l.tipo === 'rede')
      if (!isRede) guardLojaId = loja_id
    }
  }

  // membros da equipe e regras não dependem um do outro — executar em paralelo
  const [{ data: membros }, { data: regrasData }] = await Promise.all([
    admin
      .from('membros_loja')
      .select('id, role, ativo, perfil_id, pin_ativo, pin_hash, observacao_interna, perfis(nome, whatsapp, avatar_url)')
      .eq('loja_id', loja_id)
      .order('role'),
    admin
      .from('regras_comissao')
      .select('vendedora_id, percentual')
      .eq('loja_id', loja_id)
      .eq('ativo', true),
  ])
  const comissaoPorId: Record<string, number> = Object.fromEntries(
    (regrasData ?? []).map(r => [r.vendedora_id as string, r.percentual as number])
  )

  const membrosExibidos: MembroExibido[] = (membros ?? []).map(m => {
    const p = m.perfis as unknown as { nome: string; whatsapp: string | null; avatar_url?: string | null } | Array<{ nome: string; whatsapp: string | null; avatar_url?: string | null }>
    const perfil = Array.isArray(p) ? p[0] : p
    return {
      membro_id: m.id as string,
      perfil_id: m.perfil_id as string,
      nome: perfil?.nome ?? '',
      telefone: perfil?.whatsapp ?? '',
      role: m.role as string,
      ativo: m.ativo as boolean,
      percentual_comissao: comissaoPorId[m.perfil_id as string] ?? 0,
      pin_ativo: (m.pin_ativo as boolean) ?? false,
      tem_pin_hash: !!(m.pin_hash),  // boolean only — never expose the hash
      avatar_url: perfil?.avatar_url ?? null,
      observacao_interna: (m.observacao_interna as string | null) ?? null,
    }
  })

  return (
    <PinGestaoGuard lojaId={guardLojaId} scope="equipe">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">Equipe</h1>
            <p className="text-sm text-muted-foreground">{lojaNome}</p>
          </div>
        </div>
        <TabelaEquipe
          key={loja_id}
          membros={membrosExibidos}
          loja_id={loja_id}
          podeEditar={podeEditar}
          userRole={userRole}
          currentUserId={user.id}
        />
      </div>
    </PinGestaoGuard>
  )
}
