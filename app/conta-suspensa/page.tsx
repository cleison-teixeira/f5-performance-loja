export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ContaSuspensaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Conta suspensa</h1>
          <p className="text-sm text-muted-foreground">
            O acesso a esta conta foi suspenso ou cancelado. Entre em contato com o suporte F5 para regularizar sua situação.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-left">
          <p><span className="text-muted-foreground">Conta:</span> {user.email}</p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-left space-y-1">
          <p className="font-medium text-zinc-700">Fale com o suporte</p>
          <p className="text-zinc-500">
            WhatsApp:{' '}
            <a href="https://wa.me/5548988371216" className="text-zinc-900 underline underline-offset-2">
              (48) 98837-1216
            </a>
          </p>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 transition-colors"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  )
}
