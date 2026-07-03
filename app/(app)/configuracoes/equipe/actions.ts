'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { toE164 } from '@/lib/whatsapp/mask'
import { hashPin } from '@/lib/pin/gestao'
import { canAccessEquipe } from '@/lib/permissoes/roles'

export async function addMembro(dados: {
  loja_id: string
  nome: string
  telefone: string
  role: 'dono' | 'gerente' | 'vendedora'
  comissao: number
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const admin = createAdminClient()

    const { data: callerMembro } = await admin
      .from('membros_loja')
      .select('role')
      .eq('loja_id', dados.loja_id)
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .single()

    if (!callerMembro || !['gerente', 'dono', 'admin_f5'].includes(callerMembro.role as string)) {
      return { ok: false, erro: 'Sem permissão para adicionar membros a esta loja' }
    }

    // Cria usuário operacional usando phone como identificador (sem email)
    const phoneE164 = toE164(dados.telefone)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      phone: phoneE164,
      phone_confirm: true,
      user_metadata: {
        name: dados.nome,
        nome: dados.nome,
        telefone: dados.telefone,
        origem: 'equipe_operacional',
      },
    })

    if (createErr) {
      const msg = createErr.message.toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('phone')) {
        return { ok: false, erro: 'Já existe um membro cadastrado com este WhatsApp.' }
      }
      return { ok: false, erro: createErr.message }
    }
    if (!newUser.user) return { ok: false, erro: 'Erro ao criar perfil do membro' }
    const perfil_id = newUser.user.id

    await admin.from('perfis').upsert(
      { id: perfil_id, nome: dados.nome, whatsapp: dados.telefone || null },
      { onConflict: 'id' }
    )

    const { error: membroErr } = await admin.from('membros_loja').upsert(
      { loja_id: dados.loja_id, perfil_id, role: dados.role, ativo: true },
      { onConflict: 'loja_id,perfil_id' }
    )
    if (membroErr) return { ok: false, erro: membroErr.message }

    if (dados.role === 'vendedora' && dados.comissao > 0) {
      await admin.from('regras_comissao').upsert(
        { loja_id: dados.loja_id, vendedora_id: perfil_id, percentual: dados.comissao, ativo: true },
        { onConflict: 'loja_id,vendedora_id' }
      )
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function desativarMembro(membro_id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('membros_loja')
      .update({ ativo: false })
      .eq('id', membro_id)
    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function editarMembro(dados: {
  membro_id: string
  loja_id: string
  perfil_id: string
  nome: string
  telefone: string
  role: 'dono' | 'gerente' | 'vendedora'
  ativo: boolean
  percentual_comissao?: number
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    // Verifica quem está chamando
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const { data: callerMembro } = await admin
      .from('membros_loja')
      .select('role')
      .eq('loja_id', dados.loja_id)
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .single()

    const callerRole = callerMembro?.role as string | undefined
    if (!callerRole || !['gerente', 'dono', 'admin_f5'].includes(callerRole)) {
      return { ok: false, erro: 'Sem permissão' }
    }

    // Busca dados atuais do membro sendo editado
    const { data: membroAtual } = await admin
      .from('membros_loja')
      .select('role, ativo')
      .eq('id', dados.membro_id)
      .single()

    if (!membroAtual) return { ok: false, erro: 'Membro não encontrado' }

    // Gerente só pode editar vendedoras e manter como vendedora
    if (callerRole === 'gerente') {
      if (membroAtual.role !== 'vendedora') {
        return { ok: false, erro: 'Gerente só pode editar vendedoras' }
      }
      if (dados.role !== 'vendedora') {
        return { ok: false, erro: 'Gerente não pode alterar função para gerente ou dono' }
      }
    }

    // Proteção: não remover o último dono ativo
    if (membroAtual.role === 'dono') {
      const seráDemovido = dados.role !== 'dono'
      const seráDesativado = !dados.ativo && membroAtual.ativo

      if (seráDemovido || seráDesativado) {
        const { count } = await admin
          .from('membros_loja')
          .select('id', { count: 'exact', head: true })
          .eq('loja_id', dados.loja_id)
          .eq('role', 'dono')
          .eq('ativo', true)

        if ((count ?? 0) <= 1) {
          return { ok: false, erro: 'Não é possível remover ou rebaixar o último dono ativo da loja' }
        }
      }
    }

    // Atualiza perfil (nome, whatsapp)
    const { error: perfilErr } = await admin
      .from('perfis')
      .update({ nome: dados.nome.trim(), whatsapp: dados.telefone.trim() || null })
      .eq('id', dados.perfil_id)
    if (perfilErr) return { ok: false, erro: perfilErr.message }

    // Atualiza membro (role, ativo)
    const { error: membroErr } = await admin
      .from('membros_loja')
      .update({ role: dados.role, ativo: dados.ativo })
      .eq('id', dados.membro_id)
    if (membroErr) return { ok: false, erro: membroErr.message }

    // Atualiza/cria regra de comissão padrão quando for vendedora
    if (dados.role === 'vendedora' && dados.percentual_comissao !== undefined) {
      await admin.from('regras_comissao').upsert(
        {
          loja_id: dados.loja_id,
          vendedora_id: dados.perfil_id,
          percentual: dados.percentual_comissao,
          ativo: true,
        },
        { onConflict: 'loja_id,vendedora_id' }
      )
    }

    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function salvarPinMembro(dados: {
  membro_id: string
  loja_id: string
  pin: string
  pin_confirma: string
}): Promise<{ ok: boolean; erro?: string }> {
  if (dados.pin !== dados.pin_confirma) return { ok: false, erro: 'Os PINs não coincidem.' }
  if (!/^\d{4}$/.test(dados.pin)) return { ok: false, erro: 'PIN deve ter exatamente 4 dígitos.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado.' }

    const admin = createAdminClient()

    const { data: callerMembro } = await admin
      .from('membros_loja')
      .select('role')
      .eq('loja_id', dados.loja_id)
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    const callerRole = callerMembro?.role as string | undefined
    if (!callerRole || !canAccessEquipe(callerRole)) {
      return { ok: false, erro: 'Sem permissão para configurar PIN.' }
    }

    const { data: alvo } = await admin
      .from('membros_loja')
      .select('id')
      .eq('id', dados.membro_id)
      .eq('loja_id', dados.loja_id)
      .maybeSingle()
    if (!alvo) return { ok: false, erro: 'Membro não encontrado.' }

    const pin_hash = hashPin(dados.pin)
    const { error } = await admin
      .from('membros_loja')
      .update({ pin_hash, pin_ativo: true })
      .eq('id', dados.membro_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function togglePinMembro(dados: {
  membro_id: string
  loja_id: string
  ativo: boolean
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado.' }

    const admin = createAdminClient()

    const { data: callerMembro } = await admin
      .from('membros_loja')
      .select('role')
      .eq('loja_id', dados.loja_id)
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .maybeSingle()

    const callerRole = callerMembro?.role as string | undefined
    if (!callerRole || !canAccessEquipe(callerRole)) {
      return { ok: false, erro: 'Sem permissão.' }
    }

    const { data: alvo } = await admin
      .from('membros_loja')
      .select('id')
      .eq('id', dados.membro_id)
      .eq('loja_id', dados.loja_id)
      .maybeSingle()
    if (!alvo) return { ok: false, erro: 'Membro não encontrado.' }

    const { error } = await admin
      .from('membros_loja')
      .update({ pin_ativo: dados.ativo })
      .eq('id', dados.membro_id)

    if (error) return { ok: false, erro: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
