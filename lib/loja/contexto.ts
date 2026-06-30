import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const COOKIE_LOJA = 'f5_loja_ctx'

export type ContextoLoja = {
  lojas: { id: string; nome: string }[]
  lojaId: string | null
  escopo: 'rede' | 'loja'
  lojaIds: string[]
  lojaNome: string
}

export async function getLojasDoUsuario(userId: string): Promise<{ id: string; nome: string }[]> {
  const admin = createAdminClient()

  // Step 1: loja IDs (no PostgREST join — avoids FK resolution ambiguity)
  const { data: membros } = await admin
    .from('membros_loja')
    .select('loja_id')
    .eq('perfil_id', userId)
    .eq('ativo', true)

  if (!membros || membros.length === 0) return []

  const lojaIds = [...new Set(membros.map(m => m.loja_id as string))]

  // Step 2: loja names — exclui lojas internas (admin_only)
  const { data: lojas } = await admin
    .from('lojas')
    .select('id, nome')
    .in('id', lojaIds)
    .eq('admin_only', false)
    .order('nome')

  return (lojas ?? []).map(l => ({ id: l.id as string, nome: l.nome as string }))
}

export async function getContextoLoja(userId: string, multiLoja: boolean): Promise<ContextoLoja> {
  const lojas = await getLojasDoUsuario(userId)

  if (!multiLoja) {
    const loja = lojas[0] ?? null
    return {
      lojas,
      lojaId: loja?.id ?? null,
      escopo: 'loja',
      lojaIds: loja ? [loja.id] : [],
      lojaNome: loja?.nome ?? '',
    }
  }

  // Dono/admin_f5 com exatamente 1 loja: tratar como single-loja (sem "Toda a rede")
  if (lojas.length === 1) {
    const loja = lojas[0]
    return {
      lojas,
      lojaId: loja.id,
      escopo: 'loja',
      lojaIds: [loja.id],
      lojaNome: loja.nome,
    }
  }

  const jar = await cookies()
  const cookieVal = jar.get(COOKIE_LOJA)?.value ?? ''
  const lojaEncontrada = cookieVal ? lojas.find(l => l.id === cookieVal) ?? null : null

  if (lojaEncontrada) {
    return {
      lojas,
      lojaId: lojaEncontrada.id,
      escopo: 'loja',
      lojaIds: [lojaEncontrada.id],
      lojaNome: lojaEncontrada.nome,
    }
  }

  return {
    lojas,
    lojaId: null,
    escopo: 'rede',
    lojaIds: lojas.map(l => l.id),
    lojaNome: 'Toda a rede',
  }
}

export async function validarLojaDoUsuario(userId: string, lojaId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('id')
    .eq('perfil_id', userId)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()
  return !!data
}
