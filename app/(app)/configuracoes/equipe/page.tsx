import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { TabelaEquipe } from './TabelaEquipe'

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

export default async function ConfigEquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meuMembro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!meuMembro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = meuMembro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const loja_id = meuMembro.loja_id as string
  const userRole = meuMembro.role as string
  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(userRole)

  // Busca membros da loja
  const { data: membros } = await supabase
    .from('membros_loja')
    .select('id, role, ativo, perfil_id, perfis(nome, whatsapp)')
    .eq('loja_id', loja_id)
    .order('role')

  // Admin client para emails e comissões (RLS restringe vendedoras de ler regras_comissao)
  const admin = createAdminClient()
  const { data: authData } = await admin.auth.admin.listUsers()
  const emailPorId: Record<string, string> = {}
  for (const u of authData?.users ?? []) {
    emailPorId[u.id] = u.email ?? ''
  }

  // Busca comissões padrão das vendedoras
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
      <div>
        <h1 className="text-xl font-semibold">Equipe</h1>
        <p className="text-sm text-muted-foreground">{lojaNome}</p>
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
