import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: perfil }, { data: membro }] = await Promise.all([
    supabase.from('perfis').select('nome').eq('id', user.id).single(),
    supabase.from('membros_loja').select('role').eq('perfil_id', user.id).eq('ativo', true).limit(1).single(),
  ])

  const role = (membro?.role ?? 'vendedora') as string

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header nomeUsuario={perfil?.nome ?? ''} />
        <main className="flex-1 p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  )
}
