export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export default async function SemAcessoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: membros } = await admin
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  // Se já tem acesso, vai para o dashboard
  if (membros && membros.length > 0) redirect('/dashboard')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">Acesso aguardando liberação</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta ainda não foi vinculada a nenhuma loja. Entre em contato com o administrador para solicitar o acesso.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-left space-y-1">
          {perfil?.nome && (
            <p><span className="text-muted-foreground">Nome:</span> {perfil.nome}</p>
          )}
          <p><span className="text-muted-foreground">E-mail:</span> {user.email}</p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Atualizar acesso
          </a>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
            >
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
