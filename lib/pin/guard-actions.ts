'use server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { verificarPinHash } from './gestao'

// Cada tela protegida tem seu próprio cookie — unlock não vaza entre rotas
function cookieKey(scope: string) {
  return `f5_gestao_unlock_${scope}`
}

export async function verificarPinGestaoMembro(
  lojaId: string,
  scope: string,
  pin: string
): Promise<{ ok: boolean; erro?: string }> {
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, erro: 'PIN deve ter 4 a 6 dígitos.' }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado.' }

    const admin = createAdminClient()
    const { data: membros } = await admin
      .from('membros_loja')
      .select('pin_hash')
      .eq('loja_id', lojaId)
      .in('role', ['dono', 'gerente', 'admin_f5'])
      .eq('ativo', true)
      .eq('pin_ativo', true)

    if (!membros || membros.length === 0) {
      return { ok: false, erro: 'Nenhum PIN de gestão configurado.' }
    }

    const valido = membros.some(m => {
      const hash = m.pin_hash as string | null
      return hash && verificarPinHash(pin, hash)
    })

    if (!valido) return { ok: false, erro: 'PIN incorreto.' }

    // Cookie de sessão: sem maxAge → vive até fechar o browser.
    // O PinGestaoUnlockWatcher limpa ao sair da rota (useEffect cleanup).
    const cookieStore = await cookies()
    cookieStore.set(cookieKey(scope), lojaId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    })

    return { ok: true }
  } catch {
    return { ok: false, erro: 'Erro inesperado.' }
  }
}

// Chamado pelo PinGestaoUnlockWatcher quando o usuário sai da tela
export async function limparPinGestaoUnlock(scope: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(cookieKey(scope), '', { maxAge: 0, path: '/' })
}
