import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()

  // Limpa manualmente todos os cookies Supabase para garantir sessão zerada
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const response = NextResponse.redirect(new URL('/login', request.url))

  allCookies
    .filter(c => c.name.startsWith('sb-') || c.name.includes('supabase'))
    .forEach(c => {
      response.cookies.set(c.name, '', {
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
      })
    })

  return response
}
