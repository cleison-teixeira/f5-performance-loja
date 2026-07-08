'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { normalizarNomePessoa } from '@/lib/utils/normalizacao-texto'
import { toE164 } from '@/lib/whatsapp/mask'
import { hashPin } from '@/lib/pin/gestao'
import { canAccessEquipe } from '@/lib/permissoes/roles'

export async function addMembro(dados: {
  loja_id: string
  nome: string
  telefone: string
  role: 'dono' | 'gerente' | 'vendedora'
  comissao: number
  avatar_url?: string | null
  observacao_interna?: string | null
  pin?: string
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

    // Verificar se já existe perfil com este WhatsApp (busca global em perfis)
    const { data: perfisExistentes } = await admin
      .from('perfis')
      .select('id')
      .eq('whatsapp', dados.telefone)
      .order('criado_em', { ascending: true })

    let perfil_id: string

    if (perfisExistentes && perfisExistentes.length > 0) {
      // Verificar se algum desses perfis já é membro desta loja
      for (const candidato of perfisExistentes) {
        const { data: membroExistente } = await admin
          .from('membros_loja')
          .select('id, ativo')
          .eq('loja_id', dados.loja_id)
          .eq('perfil_id', candidato.id as string)
          .maybeSingle()

        if (membroExistente) {
          if (membroExistente.ativo as boolean) {
            return { ok: false, erro: 'Este WhatsApp já está cadastrado na equipe desta loja.' }
          } else {
            return { ok: false, erro: 'Este membro já existe, mas está inativo. Reative o cadastro para usar novamente.' }
          }
        }
      }
      // Perfil existe em outra(s) loja(s) — reutilizar o mais antigo e vincular aqui
      perfil_id = perfisExistentes[0].id as string
    } else {
      // Nenhum perfil com este WhatsApp — criar novo usuário
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
        return { ok: false, erro: 'Não foi possível adicionar o membro. Verifique os dados e tente novamente.' }
      }
      if (!newUser.user) return { ok: false, erro: 'Erro ao criar perfil do membro' }
      perfil_id = newUser.user.id

      await admin.from('perfis').upsert(
        { id: perfil_id, nome: normalizarNomePessoa(dados.nome), whatsapp: dados.telefone || null, avatar_url: dados.avatar_url ?? null },
        { onConflict: 'id' }
      )
    }

    const { data: novoMembro, error: membroErr } = await admin.from('membros_loja').upsert(
      { loja_id: dados.loja_id, perfil_id, role: dados.role, ativo: true, observacao_interna: dados.observacao_interna ?? null },
      { onConflict: 'loja_id,perfil_id' }
    ).select('id').single()
    if (membroErr) return { ok: false, erro: membroErr.message }

    // Salvar avatar para perfis existentes (que não passaram pelo upsert de perfil acima)
    if (dados.avatar_url && perfisExistentes && perfisExistentes.length > 0) {
      await admin.from('perfis').update({ avatar_url: dados.avatar_url }).eq('id', perfil_id)
    }

    // Salvar PIN se informado
    if (dados.pin && /^\d{4}$/.test(dados.pin) && novoMembro?.id) {
      const pin_hash = hashPin(dados.pin)
      await admin.from('membros_loja').update({ pin_hash, pin_ativo: true }).eq('id', novoMembro.id)
    }

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
  avatar_url?: string | null
  observacao_interna?: string | null
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

    // Atualiza perfil (nome, whatsapp, avatar_url se fornecido)
    const perfilUpdate: Record<string, unknown> = { nome: normalizarNomePessoa(dados.nome.trim()), whatsapp: dados.telefone.trim() || null }
    if ('avatar_url' in dados) perfilUpdate.avatar_url = dados.avatar_url ?? null
    const { error: perfilErr } = await admin.from('perfis').update(perfilUpdate).eq('id', dados.perfil_id)
    if (perfilErr) return { ok: false, erro: perfilErr.message }

    // Atualiza membro (role, ativo, observacao_interna se fornecido)
    const membroUpdate: Record<string, unknown> = { role: dados.role, ativo: dados.ativo }
    if ('observacao_interna' in dados) membroUpdate.observacao_interna = dados.observacao_interna ?? null
    const { error: membroErr } = await admin.from('membros_loja').update(membroUpdate).eq('id', dados.membro_id)
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

export async function atualizarAvatarMembro(dados: {
  perfil_id: string
  loja_id: string
  avatar_url: string | null
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
    if (!callerRole || !['gerente', 'dono', 'admin_f5'].includes(callerRole)) {
      return { ok: false, erro: 'Sem permissão para alterar foto.' }
    }

    const { data: alvo } = await admin
      .from('membros_loja')
      .select('id')
      .eq('loja_id', dados.loja_id)
      .eq('perfil_id', dados.perfil_id)
      .maybeSingle()
    if (!alvo) return { ok: false, erro: 'Membro não encontrado.' }

    const { error } = await admin
      .from('perfis')
      .update({ avatar_url: dados.avatar_url })
      .eq('id', dados.perfil_id)

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
