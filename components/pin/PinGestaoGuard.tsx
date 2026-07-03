import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { PinGestaoClient } from './PinGestaoClient'

const COOKIE_GESTAO = 'f5_gestao_unlock'

interface Props {
  children: React.ReactNode
  lojaId: string | null
}

export async function PinGestaoGuard({ children, lojaId }: Props) {
  // null = Acesso Rede ou admin_f5: sem guarda
  if (!lojaId) return <>{children}</>

  const cookieStore = await cookies()
  const unlockValue = cookieStore.get(COOKIE_GESTAO)?.value
  // Cookie válido: acesso liberado
  if (unlockValue === lojaId) return <>{children}</>

  // Verificar se há PINs de gestão ativos — sem PIN configurado, acesso direto
  const admin = createAdminClient()
  const { count } = await admin
    .from('membros_loja')
    .select('id', { count: 'exact', head: true })
    .eq('loja_id', lojaId)
    .in('role', ['dono', 'gerente', 'admin_f5'])
    .eq('ativo', true)
    .eq('pin_ativo', true)

  if (!count || count === 0) return <>{children}</>

  return <PinGestaoClient lojaId={lojaId} />
}
