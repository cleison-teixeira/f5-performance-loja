import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas públicas: acessíveis sem autenticação, sem redirect para dashboard
  const publicRoutes = ['/login', '/cadastro', '/recuperar-senha', '/atualizar-senha']
  // Destas, só estas redirecionam usuário autenticado para o dashboard
  const redirectToDashboard = ['/login', '/cadastro', '/recuperar-senha']

  const isPublicRoute = publicRoutes.some(r => pathname.startsWith(r))
  const isConviteRoute = pathname.startsWith('/convite/')
  const isApiRoute = pathname.startsWith('/api/')

  const isDebugRoute = pathname.startsWith('/debug/')

  if (isApiRoute || isConviteRoute || isDebugRoute) {
    return supabaseResponse
  }

  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    // 302 evita que o browser preserve POST em redirects de middleware
    return NextResponse.redirect(loginUrl, { status: 302 })
  }

  // /atualizar-senha NÃO está aqui: usuário autenticado via link de recovery
  // não deve ser redirecionado para o dashboard antes de trocar a senha
  if (user && redirectToDashboard.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
