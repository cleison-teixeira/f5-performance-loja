import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const COOKIE_OPERADOR = 'f5_operador_ctx'

export type OperadorAtual = {
  membroId: string
  lojaId: string
  role: string
  nome: string
}

export type MembroSelecionavel = {
  membroId: string
  lojaId: string
  role: string
  nome: string
}

export async function lojaTemPinAtivo(lojaId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('membros_loja')
    .select('id', { count: 'exact', head: true })
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .eq('pin_ativo', true)
  return (count ?? 0) > 0
}

export async function getMembrosComPin(lojaId: string): Promise<MembroSelecionavel[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('id, loja_id, role, perfis(nome)')
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .eq('pin_ativo', true)
    .order('role')

  return (data ?? []).map(m => {
    const p = m.perfis as { nome: string } | { nome: string }[] | null
    const perfil = Array.isArray(p) ? p[0] : p
    return {
      membroId: m.id as string,
      lojaId: m.loja_id as string,
      role: m.role as string,
      nome: perfil?.nome ?? '',
    }
  })
}

// Reads the operator cookie and validates it against the DB.
// Returns null if cookie is absent, malformed, or the member no longer qualifies.
export async function getOperadorAtual(lojaId: string): Promise<OperadorAtual | null> {
  const jar = await cookies()
  const raw = jar.get(COOKIE_OPERADOR)?.value
  if (!raw) return null

  let parsed: { membroId?: string; lojaId?: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!parsed.membroId || parsed.lojaId !== lojaId) return null

  // Always re-validate against DB — never trust cookie content alone
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('id, loja_id, role, ativo, pin_ativo, perfis(nome)')
    .eq('id', parsed.membroId)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .eq('pin_ativo', true)
    .maybeSingle()

  if (!data) return null

  const p = data.perfis as { nome: string } | { nome: string }[] | null
  const perfil = Array.isArray(p) ? p[0] : p

  return {
    membroId: data.id as string,
    lojaId: data.loja_id as string,
    role: data.role as string,
    nome: perfil?.nome ?? '',
  }
}
