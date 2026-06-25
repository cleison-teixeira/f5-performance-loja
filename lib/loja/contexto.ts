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
  const { data } = await admin
    .from('membros_loja')
    .select('loja_id, lojas(id, nome)')
    .eq('perfil_id', userId)
    .eq('ativo', true)

  const seen = new Set<string>()
  const lojas: { id: string; nome: string }[] = []
  for (const m of data ?? []) {
    const l = m.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }> | null
    const loja = Array.isArray(l) ? l[0] : l
    if (loja && !seen.has(loja.id)) {
      seen.add(loja.id)
      lojas.push({ id: loja.id, nome: loja.nome })
    }
  }
  return lojas
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
