import { cache } from 'react'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { measureAsync } from '@/lib/performance/timing'

export const COOKIE_LOJA = 'f5_loja_ctx'

export type ContextoLoja = {
  lojas: { id: string; nome: string; logo_url?: string | null }[]
  lojaId: string | null
  escopo: 'rede' | 'loja'
  lojaIds: string[]
  lojaNome: string
}

// Cache por request — getAppContext popula primeiro; getLojasDoUsuario reutiliza sem nova query.
const _getMembrosAtivos = async (userId: string): Promise<{ loja_id: string; role: string }[]> => {
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('loja_id, role')
    .eq('perfil_id', userId)
    .eq('ativo', true)
  return (data ?? []) as { loja_id: string; role: string }[]
}
export const getMembrosAtivos = cache(_getMembrosAtivos)

export async function getLojasDoUsuario(userId: string): Promise<{ id: string; nome: string }[]> {
  // getMembrosAtivos é cached — se getAppContext já chamou, retorna sem nova query ao DB
  const membros = await getMembrosAtivos(userId)

  if (membros.length === 0) return []

  const lojaIds = [...new Set(membros.map(m => m.loja_id))]

  // Busca nomes das lojas — exclui lojas internas (admin_only)
  const admin = createAdminClient()
  const lojasRes = await measureAsync('getLojasDoUsuario:lojas', () =>
    admin
      .from('lojas')
      .select('id, nome, logo_url')
      .in('id', lojaIds)
      .eq('admin_only', false)
      .order('nome')
  )

  return (lojasRes.data ?? []).map(l => ({ id: l.id as string, nome: l.nome as string, logo_url: (l.logo_url as string | null) ?? null }))
}

const _getContextoLojaImpl = async (userId: string, multiLoja: boolean): Promise<ContextoLoja> => {
  const lojas = await measureAsync('getContextoLoja:total', () => getLojasDoUsuario(userId))

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

// cache() do React deduplica chamadas com mesmos args dentro do mesmo request
export const getContextoLoja = cache(_getContextoLojaImpl)

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
