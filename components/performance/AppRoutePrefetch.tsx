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
  const fezPrefetch = useRef(false)

  useEffect(() => {
    if (fezPrefetch.current) return

    const timers: ReturnType<typeof setTimeout>[] = []

    const prefetchStaggered = () => {
      if (fezPrefetch.current) return
      fezPrefetch.current = true
      ROTAS.forEach((rota, i) => {
        timers.push(setTimeout(() => router.prefetch(rota), i * 300))
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
  }, [router])

  return null
}
