import { createAdminClient } from '@/lib/supabase/admin'

export type GrupoRede = { id: string; nome: string }

/**
 * Retorna o grupo_rede_id e nome do grupo da loja, ou null se a loja
 * não pertencer a nenhuma rede operacional.
 */
export async function getGrupoRedeDaLoja(lojaId: string): Promise<GrupoRede | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lojas')
    .select('grupos_rede(id, nome)')
    .eq('id', lojaId)
    .single()
  if (!data) return null
  const gr = (data as unknown as { grupos_rede: GrupoRede | null }).grupos_rede
  return gr ?? null
}

/**
 * Verifica se a loja possui rede multi-loja ativa.
 * Retorna temRede = true e grupoRedeId quando existem outras lojas ativas
 * no mesmo grupo_rede_id.
 */
export async function temRedeMultiLojaFn(
  lojaId: string
): Promise<{ temRede: boolean; grupoRedeId: string | null }> {
  const admin = createAdminClient()

  const { data: loja } = await admin
    .from('lojas')
    .select('grupo_rede_id')
    .eq('id', lojaId)
    .single()

  const grupoRedeId = (loja as { grupo_rede_id: string | null } | null)?.grupo_rede_id ?? null
  if (!grupoRedeId) return { temRede: false, grupoRedeId: null }

  const { data: outras } = await admin
    .from('lojas')
    .select('id')
    .eq('grupo_rede_id', grupoRedeId)
    .eq('ativa', true)
    .eq('admin_only', false)
    .neq('id', lojaId)

  return {
    temRede: (outras?.length ?? 0) > 0,
    grupoRedeId,
  }
}

/**
 * Retorna true somente se as duas lojas pertencem ao mesmo grupo_rede_id
 * (e esse grupo não é null).
 */
export async function validarMesmaRede(lojaAId: string, lojaBId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lojas')
    .select('id, grupo_rede_id')
    .in('id', [lojaAId, lojaBId])

  if (!data || data.length < 2) return false
  const lojas = data as { id: string; grupo_rede_id: string | null }[]
  const a = lojas.find(l => l.id === lojaAId)
  const b = lojas.find(l => l.id === lojaBId)
  return !!(a?.grupo_rede_id && b?.grupo_rede_id && a.grupo_rede_id === b.grupo_rede_id)
}
