import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { SeletorLojaGlobal } from '@/components/layout/SeletorLojaGlobal'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')
  if (!appCtx.hasMembros) redirect('/sem-acesso')

  const { perfil, role, isAcessoRede, ctx } = appCtx

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header nomeUsuario={perfil?.nome ?? ''} role={role} />
        {isAcessoRede && ctx.lojas.length > 1 && (
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
