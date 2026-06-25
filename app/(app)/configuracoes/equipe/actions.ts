'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function addMembro(dados: {
  loja_id: string
  nome: string
  email: string
  telefone: string
  role: 'dono' | 'gerente' | 'vendedora'
  comissao: number  // percentual, só usado se role === 'vendedora'
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const admin = createAdminClient()

    // Verifica se o chamador pertence à loja com role adequado
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

    // 1. Verificar se email já existe
    const { data: listData } = await admin.auth.admin.listUsers()
    const existingUser = listData?.users.find(u => u.email === dados.email)

    let perfil_id: string

    if (existingUser) {
      perfil_id = existingUser.id
    } else {
      // 2. Criar novo usuário (email confirmado automaticamente)
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: dados.email,
        email_confirm: true,
        user_metadata: { nome: dados.nome },
      })
      if (createErr || !newUser.user) {
        return { ok: false, erro: createErr?.message ?? 'Erro ao criar usuário' }
      }
      perfil_id = newUser.user.id
    }

    // 3. Atualiza perfil com nome e whatsapp
    await admin.from('perfis').upsert(
      { id: perfil_id, nome: dados.nome, whatsapp: dados.telefone },
      { onConflict: 'id' }
    )

    // 4. Adiciona ou atualiza membro na loja
    const { error: membroErr } = await admin.from('membros_loja').upsert(
      { loja_id: dados.loja_id, perfil_id, role: dados.role, ativo: true },
      { onConflict: 'loja_id,perfil_id' }
    )
    if (membroErr) return { ok: false, erro: membroErr.message }

    // 5. Se vendedora com comissão, upsert regra
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
