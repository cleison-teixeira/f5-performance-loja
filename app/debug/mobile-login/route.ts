import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

// Rota de desenvolvimento apenas — bloqueada em produção
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 })
  }

  const email = process.env.DEBUG_DEV_EMAIL
  const password = process.env.DEBUG_DEV_PASSWORD

  if (!email || !password) {
    return new NextResponse(errorPage(
      'Credenciais não configuradas',
      'Adicione DEBUG_DEV_EMAIL e DEBUG_DEV_PASSWORD no arquivo .env.local e reinicie o servidor.',
    ), { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return new NextResponse(errorPage(
      `Erro de autenticação: ${error.status ?? ''} ${error.message}`,
      `E-mail configurado: ${email}\n\nVerifique se as credenciais estão corretas e se o e-mail foi confirmado no Supabase.`,
    ), { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  if (!data.session) {
    return new NextResponse(errorPage(
      'Sessão não criada',
      'signInWithPassword retornou OK mas não gerou sessão. Tente acessar /debug/auth para diagnóstico.',
    ), { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }

  // Sessão criada — os cookies foram setados pelo @supabase/ssr via cookieStore.set()
  // e serão incluídos automaticamente no redirect pelo Next.js App Router
  return NextResponse.redirect(new URL('/dashboard', request.url))
}

function errorPage(titulo: string, detalhe: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Debug Login — Erro</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#e5e5e5;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:1rem}
  .card{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:2rem;max-width:480px;width:100%}
  h1{color:#f87171;font-size:1rem;margin:0 0 1rem}
  pre{background:#111;border-radius:8px;padding:1rem;font-size:0.75rem;white-space:pre-wrap;word-break:break-all;color:#a3a3a3;margin:0 0 1.5rem}
  a{display:block;text-align:center;background:#374151;color:#e5e5e5;text-decoration:none;padding:.75rem 1rem;border-radius:8px;font-size:.875rem}
  a:hover{background:#4b5563}
</style>
</head>
<body>
<div class="card">
  <h1>✗ ${titulo}</h1>
  <pre>${detalhe}</pre>
  <a href="/debug/auth">Ver /debug/auth</a>
</div>
</body>
</html>`
}
