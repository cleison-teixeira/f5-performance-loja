'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verificarPertenceLoja(userId: string, lojaId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', userId)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()
  return data?.role as string | null
}

const PODE_EDITAR = ['dono', 'gerente', 'admin_f5']

export async function salvarLoja(dados: {
  loja_id: string
  nome: string
  documento: string
  nicho: string
  loja_email: string
  loja_whatsapp: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Sem permissão' }

    const role = await verificarPertenceLoja(user.id, dados.loja_id)
    if (!role || !PODE_EDITAR.includes(role)) return { ok: false, erro: 'Sem permissão para editar esta loja' }
    if (!dados.nome.trim()) return { ok: false, erro: 'Nome da loja obrigatório' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('lojas')
      .update({
        nome: dados.nome.trim(),
        documento: dados.documento.trim() || null,
        nichos: dados.nicho.trim() ? [dados.nicho.trim()] : [],
        email: dados.loja_email.trim() || null,
        whatsapp: dados.loja_whatsapp.trim() || null,
      })
      .eq('id', dados.loja_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function salvarEndereco(dados: {
  loja_id: string
  cidade: string
  endereco: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Sem permissão' }

    const role = await verificarPertenceLoja(user.id, dados.loja_id)
    if (!role || !PODE_EDITAR.includes(role)) return { ok: false, erro: 'Sem permissão para editar esta loja' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('lojas')
      .update({
        cidade: dados.cidade.trim() || null,
        endereco: dados.endereco.trim() || null,
      })
      .eq('id', dados.loja_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
