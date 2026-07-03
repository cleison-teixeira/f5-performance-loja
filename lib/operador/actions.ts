'use server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { verificarPinHash } from '@/lib/pin/gestao'
import { COOKIE_OPERADOR } from './contexto'

const COOKIE_OPTS = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 8, // 8h
}

export async function ativarOperador(
  membroId: string,
  lojaId: string,
  pin: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, erro: 'PIN deve ter 4 a 6 dígitos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado.' }

  const admin = createAdminClient()

  // Caller must belong to this loja
  const { data: callerMembro } = await admin
    .from('membros_loja')
    .select('id')
    .eq('perfil_id', user.id)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .maybeSingle()

  if (!callerMembro) return { ok: false, erro: 'Sem acesso a esta loja.' }

  // Validate the target operator: must be active, pin_ativo=true, and in this loja
  const { data: membro } = await admin
    .from('membros_loja')
    .select('id, loja_id, role, pin_hash, perfis(nome)')
    .eq('id', membroId)
    .eq('loja_id', lojaId)
    .eq('ativo', true)
    .eq('pin_ativo', true)
    .maybeSingle()

  if (!membro) return { ok: false, erro: 'Operador não encontrado ou PIN inativo.' }
  if (!membro.pin_hash) return { ok: false, erro: 'PIN não configurado para este operador.' }

  const valido = verificarPinHash(pin, membro.pin_hash as string)
  if (!valido) return { ok: false, erro: 'PIN incorreto.' }

  const p = membro.perfis as { nome: string } | { nome: string }[] | null
  const perfil = Array.isArray(p) ? p[0] : p

  const payload = JSON.stringify({
    membroId: membro.id,
    lojaId: membro.loja_id,
  })

  const jar = await cookies()
  jar.set(COOKIE_OPERADOR, payload, COOKIE_OPTS)

  return { ok: true, nome: perfil?.nome ?? '' } as { ok: boolean; nome?: string }
}

export async function limparOperador(): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE_OPERADOR, '', { path: '/', httpOnly: true, maxAge: 0 })
}
