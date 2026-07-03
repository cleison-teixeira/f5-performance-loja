import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { PinGestaoClient } from './PinGestaoClient'
import { PinGestaoUnlockWatcher } from './PinGestaoUnlockWatcher'

interface Props {
  children: React.ReactNode
  lojaId: string | null  // null = Acesso Rede / admin_f5: sem guarda
  scope: string          // identificador da rota: 'equipe' | 'minha_conta' | 'bibliotecas'
}

export async function PinGestaoGuard({ children, lojaId, scope }: Props) {
  if (!lojaId) return <>{children}</>

  const cookieStore = await cookies()
  const unlockValue = cookieStore.get(`f5_gestao_unlock_${scope}`)?.value

  // Cookie válido para este escopo: libera conteúdo + monta o watcher de cleanup
  if (unlockValue === lojaId) {
    return (
      <>
        <PinGestaoUnlockWatcher scope={scope} />
        {children}
      </>
    )
  }

  // Sem cookie: verificar se há PINs de gestão ativos — sem PIN = acesso direto
  const admin = createAdminClient()
  const { count } = await admin
    .from('membros_loja')
    .select('id', { count: 'exact', head: true })
    .eq('loja_id', lojaId)
    .in('role', ['dono', 'gerente', 'admin_f5'])
    .eq('ativo', true)
    .eq('pin_ativo', true)

  if (!count || count === 0) return <>{children}</>

  return <PinGestaoClient lojaId={lojaId} scope={scope} />
}
