import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { SeletorLojaGlobal } from '@/components/layout/SeletorLojaGlobal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getContextoLoja } from '@/lib/loja/contexto'
import { measureAsync, startTimer } from '@/lib/performance/timing'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const endLayout = startTimer('layout:total')
  const supabase = await createClient()

  const { data: { user } } = await measureAsync('layout:auth.getUser', () =>
    supabase.auth.getUser()
  )
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: perfil }, { data: todosMembros }, { data: libData }] = await measureAsync(
    'layout:Promise.all[perfis+membros+liberacoes]',
    () => Promise.all([
      supabase.from('perfis').select('nome').eq('id', user.id).single(),
      admin.from('membros_loja').select('role').eq('perfil_id', user.id).eq('ativo', true),
      admin.from('liberacoes_acesso')
        .select('tipo, status')
        .eq('email', (user.email ?? '').toLowerCase())
        .in('status', ['aplicado', 'ativo']),
    ])
  )

  if (!todosMembros || todosMembros.length === 0) redirect('/sem-acesso')

  const role = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const isAcessoRede = role === 'admin_f5' || (libData ?? []).some(l => l.tipo === 'rede')
  const ctx = isAcessoRede
    ? await measureAsync('layout:getContextoLoja', () => getContextoLoja(user.id, true))
    : null
  endLayout()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header nomeUsuario={perfil?.nome ?? ''} role={role} />
        {ctx && ctx.lojas.length > 1 && (
          <SeletorLojaGlobal lojas={ctx.lojas} lojaAtiva={ctx.lojaId} />
        )}
        <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  )
}
