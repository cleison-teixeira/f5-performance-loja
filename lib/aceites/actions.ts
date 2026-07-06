'use server'

import { createClient } from '@/lib/supabase/server'

const TIPOS = ['termos_uso', 'politica_privacidade', 'contrato_lgpd'] as const
const VERSAO = '1.0'

export async function registrarAceites(
  lojaId: string | null
): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado.' }

    const registros = TIPOS.map(tipo => ({
      usuario_id: user.id,
      loja_id: lojaId ?? null,
      tipo,
      versao: VERSAO,
      origem: 'app',
    }))

    const { error } = await supabase.from('aceites_legais').insert(registros)
    if (error) return { ok: false, erro: error.message }

    return { ok: true }
  } catch {
    return { ok: false, erro: 'Erro interno.' }
  }
}
