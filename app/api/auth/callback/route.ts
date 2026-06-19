import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.debug('[AUTH] callback GET', { origin, code: code ? '***' : null, next })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.debug('[AUTH] exchangeCodeForSession OK — redirecionando para', next)
      return NextResponse.redirect(new URL(next, origin))
    }

    console.error('[AUTH] exchangeCodeForSession falhou', {
      status: error.status,
      message: error.message,
    })
  } else {
    console.warn('[AUTH] callback sem code — possível hash-fragment ou link expirado')
  }

  return NextResponse.redirect(new URL('/login?erro=link_invalido', origin))
}
