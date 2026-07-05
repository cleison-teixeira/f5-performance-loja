'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROTAS_DESKTOP = [
  '/dashboard',
  '/avisos',
  '/relacionamento',
  '/clientes',
  '/produtos',
  '/lista-espera',
  '/vendas',
  '/perdas',
]

const ROTAS_MOBILE = [
  '/dashboard',
  '/avisos',
  '/relacionamento',
  '/clientes',
  '/lista-espera',
]

export function AppRoutePrefetch() {
  const router = useRouter()

  useEffect(() => {
    const isMobile = window.innerWidth < 768
    const rotas = isMobile ? ROTAS_MOBILE : ROTAS_DESKTOP

    const prefetch = () => {
      for (const rota of rotas) {
        router.prefetch(rota)
      }
    }

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(prefetch, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    } else {
      const id = setTimeout(prefetch, 2000)
      return () => clearTimeout(id)
    }
  }, [router])

  return null
}
