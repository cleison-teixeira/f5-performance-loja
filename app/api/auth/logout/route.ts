import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const url = new URL('/login', request.url)
  // 303 See Other força o browser a fazer GET na URL de destino,
  // evitando 405 quando o form original era POST
  return NextResponse.redirect(url, { status: 303 })
}
