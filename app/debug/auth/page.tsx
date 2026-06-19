import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import Link from 'next/link'
import { DebugClientSection } from './DebugClientSection'

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const color =
    ok === true ? 'text-green-700' : ok === false ? 'text-red-600' : 'text-gray-800'
  return (
    <tr className="border-b last:border-0">
      <td className="py-2 pr-4 text-xs font-medium text-gray-500 whitespace-nowrap align-top">{label}</td>
      <td className={`py-2 text-xs font-mono break-all ${color}`}>{value}</td>
    </tr>
  )
}

export default async function DebugAuthPage() {
  const headersList = await headers()
  const host = headersList.get('host') ?? '—'
  const xForwardedFor = headersList.get('x-forwarded-for') ?? '—'
  const userAgent = headersList.get('user-agent') ?? '—'
  const origin = `http://${host}`

  const supabase = await createClient()

  // getSession() lê do cookie (o que o middleware/server enxerga)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  const user = session?.user

  const sessionExists = !!session
  const expiresAt = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : '—'

  let membroInfo: { role: string; loja_id: string; loja_nome: string } | null = null
  let membroError: string | null = null

  if (user) {
    const { data: membro, error } = await supabase
      .from('membros_loja')
      .select('role, loja_id, lojas(nome)')
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .limit(1)
      .single()

    if (error) {
      membroError = `${error.code}: ${error.message}`
    } else if (membro) {
      const lojaRaw = membro.lojas as unknown as { nome: string } | Array<{ nome: string }>
      const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
      membroInfo = {
        role: membro.role as string,
        loja_id: membro.loja_id as string,
        loja_nome: loja?.nome ?? '—',
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-900">Debug — Auth</h1>
          <span className="text-xs text-gray-400">{new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
        </div>

        {/* Origem / Rede — server-side */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Servidor (request headers)</p>
          <table className="w-full">
            <tbody>
              <Row label="host" value={host} />
              <Row label="origin (servidor)" value={origin} />
              <Row label="x-forwarded-for" value={xForwardedFor} />
              <Row label="user-agent" value={userAgent.slice(0, 80)} />
            </tbody>
          </table>
        </div>

        {/* Origem / localStorage — client-side */}
        <DebugClientSection />

        {/* Sessão */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sessão Supabase</p>
          {sessionError && (
            <p className="text-xs text-red-600 mb-2">Erro ao ler sessão: {sessionError.message}</p>
          )}
          <table className="w-full">
            <tbody>
              <Row label="sessão existe?" value={sessionExists ? 'SIM' : 'NÃO'} ok={sessionExists} />
              <Row label="user email" value={user?.email ?? '—'} ok={!!user?.email} />
              <Row label="user id" value={user?.id ?? '—'} ok={!!user?.id} />
              <Row label="expires_at" value={expiresAt} ok={sessionExists} />
            </tbody>
          </table>
        </div>

        {/* Perfil / Loja */}
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Perfil / Loja</p>
          {!user && (
            <p className="text-xs text-gray-500">Sem sessão — não foi possível consultar perfil.</p>
          )}
          {membroError && (
            <p className="text-xs text-red-600 mb-2">Erro ao buscar membro: {membroError}</p>
          )}
          {user && !membroError && (
            <table className="w-full">
              <tbody>
                <Row
                  label="membro encontrado?"
                  value={membroInfo ? 'SIM' : 'NÃO — sem loja ativa'}
                  ok={!!membroInfo}
                />
                <Row label="role" value={membroInfo?.role ?? '—'} ok={!!membroInfo?.role} />
                <Row label="loja_id" value={membroInfo?.loja_id ?? '—'} ok={!!membroInfo?.loja_id} />
                <Row label="loja_nome" value={membroInfo?.loja_nome ?? '—'} ok={!!membroInfo?.loja_nome} />
              </tbody>
            </table>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <Link
            href="/debug/logout"
            className="flex-1 rounded-xl bg-red-500 text-white text-sm font-semibold py-3 text-center"
          >
            Logout + limpar cookies
          </Link>
          <Link
            href="/login"
            className="flex-1 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold py-3 text-center"
          >
            Ir para /login
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400">
          Remova estas rotas em produção
        </p>
      </div>
    </div>
  )
}
