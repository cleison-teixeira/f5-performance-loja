import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PinEntryClient } from './PinEntryClient'

interface Props {
  lojaId: string | null
  role: string
  rotaAtual: '/minha-conta' | '/configuracoes/equipe' | '/configuracoes/bibliotecas'
  children: React.ReactNode
}

export async function PinGuard({ lojaId, role, rotaAtual, children }: Props) {
  // admin_f5 passa direto
  if (role === 'admin_f5') return <>{children}</>

  // sem loja resolvida: passa (sem contexto para verificar PIN)
  if (!lojaId) return <>{children}</>

  const admin = createAdminClient()
  const { data: loja } = await admin
    .from('lojas')
    .select('pin_gestao_hash')
    .eq('id', lojaId)
    .single()

  const temPin = !!(loja as { pin_gestao_hash?: string | null } | null)?.pin_gestao_hash

  // Sem PIN: /minha-conta abre para configurar; demais redirecionam
  if (!temPin) {
    if (rotaAtual === '/minha-conta') return <>{children}</>
    redirect('/minha-conta?aviso=sem-pin')
  }

  // Com PIN: verificar cookie de desbloqueio
  const cookieStore = await cookies()
  const desbloqueado = cookieStore.get(`f5_gestao_ok_${lojaId}`)?.value === '1'

  if (desbloqueado) return <>{children}</>

  return <PinEntryClient lojaId={lojaId} />
}
