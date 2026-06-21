import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Building2, ShieldCheck } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  dono: 'Dono',
  gerente: 'Gerente',
  vendedora: 'Vendedora',
  admin_f5: 'Admin Recway',
}

const ROLE_COLOR: Record<string, string> = {
  dono: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  gerente: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  vendedora: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  admin_f5: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

async function handleSair() {
  'use server'
  const { createClient: createServerClient } = await import('@/lib/supabase/server')
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome')
    .eq('id', user.id)
    .single()

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role, lojas(id, nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  const lojaRaw = membro?.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }> | null
  const loja = lojaRaw ? (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw) : null
  const role = membro?.role as string | undefined
  const roleLabel = role ? (ROLE_LABEL[role] ?? role) : '—'
  const roleBadgeColor = role ? (ROLE_COLOR[role] ?? 'bg-muted text-muted-foreground') : 'bg-muted text-muted-foreground'

  const nomeUsuario = perfil?.nome ?? ''
  const iniciais = nomeUsuario
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja?.nome ?? ''}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Informações da sua conta e do acesso conectado à loja.
        </p>
      </div>

      {/* ── Card de destaque — perfil do usuário ── */}
      <div className="rounded-xl border bg-muted/40 border-border/60 p-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xl shrink-0">
            {iniciais}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-base text-foreground leading-snug truncate">
                  {nomeUsuario || '—'}
                </p>
                <p className="text-sm text-muted-foreground truncate" title={user.email ?? ''}>
                  {user.email ?? '—'}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>
            {loja?.nome && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground truncate">{loja.nome}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Cards secundários ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Card Acesso */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 flex-none text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">
              Acesso
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Loja conectada</p>
              <div className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <p className="text-sm font-medium truncate">{loja?.nome ?? '—'}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nível de acesso</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColor}`}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Card Sessão */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <LogOut className="h-3 w-3 flex-none text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65">
              Sessão
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use esta opção apenas se quiser encerrar o acesso neste dispositivo.
          </p>
          <form action={handleSair}>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
