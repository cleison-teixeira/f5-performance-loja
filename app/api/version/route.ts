import { NextResponse } from 'next/server'

// Rota leve para o AppUpdateChecker comparar a versão em execução no
// navegador com a versão realmente publicada no servidor. VERCEL_GIT_COMMIT_SHA
// é preenchida automaticamente pela Vercel em cada deploy (não precisa de
// configuração manual); em ambiente local cai no fallback 'dev'.
export async function GET() {
  const versao = process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev'
  return NextResponse.json(
    { versao },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
  )
}
