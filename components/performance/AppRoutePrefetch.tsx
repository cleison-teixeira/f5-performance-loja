'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const ROTAS = [
  '/dashboard',
  '/avisos',
  '/relacionamento',
  '/clientes',
  '/lista-espera',
]

export function AppRoutePrefetch() {
  const router = useRouter()
  const routerRef = useRef(router)
  const fezPrefetch = useRef(false)

  // Mantém ref atualizado sem re-executar o efeito de prefetch
  useEffect(() => {
    routerRef.current = router
  }, [router])

  // Executa uma única vez — sem [router] no dep array para evitar double-fire
  useEffect(() => {
    if (fezPrefetch.current) return

    const timers: ReturnType<typeof setTimeout>[] = []

    const prefetchStaggered = () => {
      if (fezPrefetch.current) return
      fezPrefetch.current = true
      ROTAS.forEach((rota, i) => {
        timers.push(setTimeout(() => routerRef.current.prefetch(rota), i * 300))
      })
    }

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(prefetchStaggered, { timeout: 8000 })
      return () => {
        cancelIdleCallback(id)
        timers.forEach(clearTimeout)
      }
    } else {
      const id = setTimeout(prefetchStaggered, 5000)
      return () => {
        clearTimeout(id)
        timers.forEach(clearTimeout)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
