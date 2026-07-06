'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getAppContext } from '@/lib/app/contexto'

export async function marcarNaoContatar({
  cliente_id,
  loja_id,
  motivo,
  origem,
  observacao,
}: {
  cliente_id: string
  loja_id: string
  motivo: string
  origem: string
  observacao?: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const appCtx = await getAppContext()
    if (!appCtx) return { ok: false, erro: 'Não autenticado.' }
    if (!appCtx.lojaIds.includes(loja_id)) return { ok: false, erro: 'Acesso negado.' }

    const admin = createAdminClient()
    const userId = appCtx.user?.id ?? null

    const { error } = await admin
      .from('clientes')
      .update({
        nao_contatar: true,
        nao_contatar_em: new Date().toISOString(),
        nao_contatar_motivo: motivo || null,
        nao_contatar_origem: origem || null,
        nao_contatar_usuario_id: userId,
        contato_reativado_em: null,
        contato_reativado_usuario_id: null,
      })
      .eq('id', cliente_id)
      .eq('loja_id', loja_id)

    if (error) return { ok: false, erro: 'Erro ao atualizar cliente.' }

    await admin.from('clientes_privacidade_eventos').insert({
      loja_id,
      cliente_id,
      usuario_id: userId,
      tipo: 'nao_contatar_marcado',
      motivo: motivo || null,
      origem: origem || null,
      metadata: observacao ? { observacao } : {},
    })

    return { ok: true }
  } catch {
    return { ok: false, erro: 'Erro interno.' }
  }
}

export async function reativarContato({
  cliente_id,
  loja_id,
}: {
  cliente_id: string
  loja_id: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const appCtx = await getAppContext()
    if (!appCtx) return { ok: false, erro: 'Não autenticado.' }
    if (!appCtx.lojaIds.includes(loja_id)) return { ok: false, erro: 'Acesso negado.' }

    const role = appCtx.role
    if (role === 'vendedora') {
      return { ok: false, erro: 'Apenas dono ou gerente pode reativar o contato.' }
    }

    const admin = createAdminClient()
    const userId = appCtx.user?.id ?? null

    const { error } = await admin
      .from('clientes')
      .update({
        nao_contatar: false,
        contato_reativado_em: new Date().toISOString(),
        contato_reativado_usuario_id: userId,
        nao_contatar_em: null,
        nao_contatar_motivo: null,
        nao_contatar_origem: null,
        nao_contatar_usuario_id: null,
      })
      .eq('id', cliente_id)
      .eq('loja_id', loja_id)

    if (error) return { ok: false, erro: 'Erro ao reativar contato.' }

    await admin.from('clientes_privacidade_eventos').insert({
      loja_id,
      cliente_id,
      usuario_id: userId,
      tipo: 'nao_contatar_removido',
      motivo: null,
      origem: null,
      metadata: {},
    })

    return { ok: true }
  } catch {
    return { ok: false, erro: 'Erro interno.' }
  }
}
