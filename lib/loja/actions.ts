'use server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { validarLojaDoUsuario, COOKIE_LOJA } from './contexto'

export async function setLojaContexto(lojaId: string | null): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const jar = await cookies()

  if (!lojaId) {
    jar.set(COOKIE_LOJA, '', { path: '/', httpOnly: true, sameSite: 'lax' })
    return
  }

  const ok = await validarLojaDoUsuario(user.id, lojaId)
  if (!ok) return

  jar.set(COOKIE_LOJA, lojaId, { path: '/', httpOnly: true, sameSite: 'lax' })
}
