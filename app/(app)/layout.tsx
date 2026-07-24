import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Header } from '@/components/layout/Header'
import { SeletorLojaGlobal } from '@/components/layout/SeletorLojaGlobal'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'
import { getNotificacoes } from '@/lib/notifications/getNotificacoes'
import { verificarAceitePendente } from '@/lib/aceites/verificar'
import { ModalAceite } from '@/components/aceites/ModalAceite'
import { startTimer } from '@/lib/performance/timing'
import { ClientPerformanceReporter } from '@/components/performance/ClientPerformanceReporter'
import { AppRoutePrefetch } from '@/components/performance/AppRoutePrefetch'
import { RouteProgress } from '@/components/layout/RouteProgress'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const endLayout = startTimer('app-layout:total')
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')
  if (!appCtx.hasMembros) redirect('/sem-acesso')
  if (appCtx.acessoBloqueado) redirect('/conta-suspensa')

  const { perfil, role, isAcessoRede, ctx } = appCtx

  const hoje = new Date().toISOString().split('T')[0]
  const [notifResult, precisaAceitar] = await Promise.all([
    getNotificacoes({ isAdminF5: role === 'admin_f5', lojaIds: appCtx.lojaIds, hoje }),
    (role === 'dono' || role === 'gerente') && appCtx.user?.id
      ? verificarAceitePendente(appCtx.user.id)
      : Promise.resolve(false),
  ])
  const { notificacoes, badgesMap } = notifResult

  endLayout()

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar role={role} badgesMap={badgesMap} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header nomeUsuario={perfil?.nome ?? ''} nomeLoja={appCtx.lojaNome} role={role} notificacoes={notificacoes} userId={appCtx.user?.id} lojaLogoUrl={appCtx.lojaLogoUrl} avatarUrl={appCtx.avatarUrl} isAcessoRede={isAcessoRede} />
        {isAcessoRede && ctx.lojas.length > 1 && (
          <SeletorLojaGlobal lojas={ctx.lojas} lojaAtiva={ctx.lojaId} />
        )}
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav role={role} badgesMap={badgesMap} />
      {precisaAceitar && <ModalAceite lojaId={ctx.lojaId ?? null} />}
      <RouteProgress />
      <AppRoutePrefetch />
      <ClientPerformanceReporter />
    </div>
  )
}
