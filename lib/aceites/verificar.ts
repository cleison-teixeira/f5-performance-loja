import { createAdminClient } from '@/lib/supabase/admin'

const TIPOS_OBRIGATORIOS = ['termos_uso', 'politica_privacidade', 'contrato_lgpd'] as const
const VERSAO_ATUAL = '1.0'

export async function verificarAceitePendente(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('aceites_legais')
      .select('tipo')
      .eq('usuario_id', userId)
      .eq('versao', VERSAO_ATUAL)
      .in('tipo', TIPOS_OBRIGATORIOS)

    const aceitos = new Set((data ?? []).map(a => a.tipo as string))
    return !TIPOS_OBRIGATORIOS.every(t => aceitos.has(t))
  } catch {
    return false
  }
}
