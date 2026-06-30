'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verificarAdminF5() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('role', 'admin_f5')
    .eq('ativo', true)
    .limit(1)
  if (!data || data.length === 0) return null
  return user
}

// ── Empresa ───────────────────────────────────────────────────────────────────

export async function criarEmpresa(dados: {
  nome: string
  responsavel_nome: string
  responsavel_whatsapp: string
  responsavel_email: string
  nicho: string
  plano_id: string
  status: string
  billing_status: string
  notas_internas: string
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  try {
    const user = await verificarAdminF5()
    if (!user) return { ok: false, erro: 'Sem permissão' }
    if (!dados.nome.trim()) return { ok: false, erro: 'Nome obrigatório' }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('empresas')
      .insert({
        nome: dados.nome.trim(),
        responsavel_nome: dados.responsavel_nome.trim() || null,
        responsavel_whatsapp: dados.responsavel_whatsapp.trim() || null,
        responsavel_email: dados.responsavel_email.trim() || null,
        nicho: dados.nicho.trim() || null,
        plano_id: dados.plano_id || null,
        status: dados.status || 'em_onboarding',
        billing_status: dados.billing_status || 'trial',
        notas_internas: dados.notas_internas.trim() || null,
      })
      .select('id')
      .single()

    if (error) return { ok: false, erro: error.message }
    return { ok: true, id: data.id as string }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function atualizarEmpresa(dados: {
  id: string
  nome: string
  responsavel_nome: string
  responsavel_whatsapp: string
  responsavel_email: string
  nicho: string
  plano_id: string
  status: string
  billing_status: string
  notas_internas: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const user = await verificarAdminF5()
    if (!user) return { ok: false, erro: 'Sem permissão' }
    if (!dados.nome.trim()) return { ok: false, erro: 'Nome obrigatório' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('empresas')
      .update({
        nome: dados.nome.trim(),
        responsavel_nome: dados.responsavel_nome.trim() || null,
        responsavel_whatsapp: dados.responsavel_whatsapp.trim() || null,
        responsavel_email: dados.responsavel_email.trim() || null,
        nicho: dados.nicho.trim() || null,
        plano_id: dados.plano_id || null,
        status: dados.status,
        billing_status: dados.billing_status,
        notas_internas: dados.notas_internas.trim() || null,
      })
      .eq('id', dados.id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

// ── Loja ─────────────────────────────────────────────────────────────────────

export async function criarLoja(dados: {
  empresa_id: string
  nome: string
  cidade: string
  whatsapp: string
  ativa: boolean
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  try {
    const user = await verificarAdminF5()
    if (!user) return { ok: false, erro: 'Sem permissão' }
    if (!dados.nome.trim()) return { ok: false, erro: 'Nome da loja obrigatório' }

    const admin = createAdminClient()

    // Verificar limite do plano
    const { data: empresa } = await admin
      .from('empresas')
      .select('plano_id')
      .eq('id', dados.empresa_id)
      .single()

    if (empresa?.plano_id) {
      const { data: plano } = await admin
        .from('planos')
        .select('max_lojas')
        .eq('id', empresa.plano_id)
        .single()

      if (plano && (plano.max_lojas as number | null) != null) {
        const { count } = await admin
          .from('lojas')
          .select('id', { count: 'exact', head: true })
          .eq('empresa_id', dados.empresa_id)
          .eq('ativa', true)

        if ((count ?? 0) >= (plano.max_lojas as number)) {
          return {
            ok: false,
            erro: 'Limite de lojas do plano atingido. Faça upgrade antes de adicionar nova loja.',
          }
        }
      }
    }

    const { data, error } = await admin
      .from('lojas')
      .insert({
        empresa_id: dados.empresa_id,
        nome: dados.nome.trim(),
        cidade: dados.cidade.trim() || null,
        whatsapp: dados.whatsapp.trim() || null,
        ativa: dados.ativa,
      })
      .select('id')
      .single()

    if (error) return { ok: false, erro: error.message }
    return { ok: true, id: data.id as string }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

// ── Usuários e acessos ────────────────────────────────────────────────────────

export type UsuarioResult = {
  id: string
  email: string
  nome: string | null
  vinculos: Array<{
    membro_id: string
    loja_id: string
    loja_nome: string
    role: string
    ativo: boolean
  }>
}

export async function buscarUsuarioPorEmail(email: string): Promise<{
  ok: boolean
  usuario?: UsuarioResult
  erro?: string
}> {
  try {
    const user = await verificarAdminF5()
    if (!user) return { ok: false, erro: 'Sem permissão' }

    const admin = createAdminClient()
    const { data: authData } = await admin.auth.admin.listUsers()
    const encontrado = authData?.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase().trim()
    )

    if (!encontrado) return { ok: false, erro: 'Usuário não encontrado no sistema' }

    const [perfilRes, membrosRes] = await Promise.all([
      admin.from('perfis').select('nome').eq('id', encontrado.id).maybeSingle(),
      admin.from('membros_loja').select('id, loja_id, role, ativo').eq('perfil_id', encontrado.id),
    ])

    const lojaIds = (membrosRes.data ?? []).map(m => m.loja_id as string)
    const lojaMap: Record<string, string> = {}
    if (lojaIds.length > 0) {
      const { data: lojas } = await admin.from('lojas').select('id, nome').in('id', lojaIds)
      ;(lojas ?? []).forEach(l => { lojaMap[l.id as string] = l.nome as string })
    }

    return {
      ok: true,
      usuario: {
        id: encontrado.id,
        email: encontrado.email ?? '',
        nome: perfilRes.data?.nome as string | null,
        vinculos: (membrosRes.data ?? []).map(m => ({
          membro_id: m.id as string,
          loja_id: m.loja_id as string,
          loja_nome: lojaMap[m.loja_id as string] ?? 'Loja desconhecida',
          role: m.role as string,
          ativo: m.ativo as boolean,
        })),
      },
    }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function vincularUsuario(dados: {
  perfil_id: string
  loja_id: string
  role: 'dono' | 'gerente' | 'vendedora' | 'admin_f5'
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const user = await verificarAdminF5()
    if (!user) return { ok: false, erro: 'Sem permissão' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('membros_loja')
      .upsert(
        { perfil_id: dados.perfil_id, loja_id: dados.loja_id, role: dados.role, ativo: true },
        { onConflict: 'loja_id,perfil_id' }
      )

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function alterarAcesso(
  membro_id: string,
  ativo: boolean
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const user = await verificarAdminF5()
    if (!user) return { ok: false, erro: 'Sem permissão' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('membros_loja')
      .update({ ativo })
      .eq('id', membro_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
