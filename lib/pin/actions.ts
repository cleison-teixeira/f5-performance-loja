'use server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { hashPin, verificarPinHash } from './gestao'

const COOKIE_DURATION = 8 * 60 * 60 // 8 horas em segundos

export async function salvarPinGestao(
  lojaId: string,
  pin: string,
  pinConfirmacao: string
): Promise<{ ok: boolean; erro?: string }> {
  if (pin !== pinConfirmacao) return { ok: false, erro: 'Os PINs não coincidem.' }
  if (!/^\d{4}$/.test(pin)) return { ok: false, erro: 'PIN deve ter exatamente 4 dígitos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Não autenticado.' }

  const admin = createAdminClient()

  const { data: membro } = await admin
    .from('membros_loja')
    .select('role')
    .eq('loja_id', lojaId)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .single()

  if (!membro || !['dono', 'gerente', 'admin_f5'].includes(membro.role as string)) {
    return { ok: false, erro: 'Sem permissão para configurar PIN desta loja.' }
  }

  const hash = hashPin(pin)

  const { error } = await admin
    .from('lojas')
    .update({ pin_gestao_hash: hash, pin_gestao_atualizado_em: new Date().toISOString() })
    .eq('id', lojaId)

  if (error) return { ok: false, erro: error.message }

  const cookieStore = await cookies()
  cookieStore.set(`f5_gestao_ok_${lojaId}`, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_DURATION,
    path: '/',
    sameSite: 'lax',
  })

  return { ok: true }
}

export async function verificarPinGestaoAction(
  lojaId: string,
  pin: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!/^\d{4}$/.test(pin)) return { ok: false, erro: 'PIN inválido.' }

  const admin = createAdminClient()
  const { data: loja } = await admin
    .from('lojas')
    .select('pin_gestao_hash')
    .eq('id', lojaId)
    .single()

  if (!loja?.pin_gestao_hash) return { ok: false, erro: 'PIN não configurado.' }

  const valido = verificarPinHash(pin, loja.pin_gestao_hash as string)
  if (!valido) return { ok: false, erro: 'PIN inválido.' }

  const cookieStore = await cookies()
  cookieStore.set(`f5_gestao_ok_${lojaId}`, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_DURATION,
    path: '/',
    sameSite: 'lax',
  })

  return { ok: true }
}
