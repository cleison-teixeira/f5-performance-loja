export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getMembrosComPin, getOperadorAtual } from '@/lib/operador/contexto'
import { SelecionarOperadorClient } from './SelecionarOperadorClient'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function SelecionarOperadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [{ data: membrosData }, { data: libData }] = await Promise.all([
    admin
      .from('membros_loja')
      .select('role, loja_id, lojas(nome)')
      .eq('perfil_id', user.id)
      .eq('ativo', true),
    admin
      .from('liberacoes_acesso')
      .select('tipo, status')
      .eq('email', (user.email ?? '').toLowerCase())
      .in('status', ['aplicado', 'ativo']),
  ])

  if (!membrosData || membrosData.length === 0) redirect('/sem-acesso')

  const role = membrosData.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, membrosData[0].role as string)

  // Acesso Dono/rede nunca deve cair aqui
  const isAcessoRede = role === 'admin_f5' || (libData ?? []).some(l => l.tipo === 'rede')
  if (isAcessoRede) redirect('/dashboard')

  const primeiroMembro = membrosData[0] as { loja_id: string; lojas: { nome: string } | { nome: string }[] | null }
  const lojaId = primeiroMembro.loja_id
  if (!lojaId) redirect('/dashboard')

  const lojaRaw = primeiroMembro.lojas
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''

  const membrosComPin = await getMembrosComPin(lojaId)

  // No PIN active anywhere in this loja → go to app normally
  if (membrosComPin.length === 0) redirect('/dashboard')

  // Already has a valid operator → no need to select again
  const operadorAtual = await getOperadorAtual(lojaId)
  if (operadorAtual) redirect('/dashboard')

  return (
    <SelecionarOperadorClient
      membros={membrosComPin}
      lojaId={lojaId}
      lojaNome={lojaNome}
    />
  )
}
