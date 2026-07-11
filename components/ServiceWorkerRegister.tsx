'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(console.error)
    }
  }, [])

  return null
}
