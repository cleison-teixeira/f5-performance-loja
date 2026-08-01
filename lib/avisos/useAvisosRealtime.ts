'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { criarAgendadorDebounce } from './debounceRefresh'

const DEBOUNCE_MS = 700

// Sem filtro de loja_id no client: a RLS de avisos (membros_veem_avisos,
// escopada por loja_id IN lojas_do_usuario()) já é aplicada pelo Realtime
// por assinante, então "Toda a rede" funciona automaticamente sem múltiplos
// channels. O evento é só um sinal de invalidação — router.refresh() busca
// o estado oficial no Server Component.
export function useAvisosRealtime() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { agendar, cancelar } = criarAgendadorDebounce(() => router.refresh(), DEBOUNCE_MS)
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelado = false

    // O JWT da sessão precisa estar explicitamente setado no client Realtime
    // antes de assinar — sem isso a conexão fica no papel anon, que não tem
    // policy de SELECT em avisos, e nenhum evento é entregue.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelado) return
      if (session?.access_token) supabase.realtime.setAuth(session.access_token)
      channel = supabase
        .channel('avisos-realtime-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, agendar)
        .subscribe()
    })

    return () => {
      cancelado = true
      cancelar()
      if (channel) supabase.removeChannel(channel)
    }
  }, [router])
}
