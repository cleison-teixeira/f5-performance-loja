import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  dono: 'Dono',
  gerente: 'Gerente',
  vendedora: 'Vendedora',
  admin_f5: 'Admin Recway',
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

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-xl font-semibold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Veja as informações da sua conta e da loja conectada.
        </p>
      </div>

      {/* Conta */}
      <section className="rounded-xl border bg-card divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conta</p>
        </div>
        <InfoRow label="Nome" value={perfil?.nome ?? '—'} />
        <InfoRow label="E-mail" value={user.email ?? '—'} />
      </section>

      {/* Acesso */}
      <section className="rounded-xl border bg-card divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acesso</p>
        </div>
        <InfoRow label="Loja" value={loja?.nome ?? '—'} />
        <InfoRow label="Perfil" value={roleLabel} />
      </section>

      {/* Sessão */}
      <section className="rounded-xl border bg-card divide-y divide-border">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sessão</p>
        </div>
        <div className="px-4 py-4">
          <form action={handleSair}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3 text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right truncate">{value}</span>
    </div>
  )
}
