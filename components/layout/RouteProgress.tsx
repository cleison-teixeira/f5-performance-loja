'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function RouteProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [completing, setCompleting] = useState(false)
  const prevPath = useRef(pathname)
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href.startsWith('/') || href === pathname) return
      clearTimeout(hideTimer.current)
      setCompleting(false)
      setVisible(true)
    }
    document.addEventListener('click', onLinkClick)
    return () => document.removeEventListener('click', onLinkClick)
  }, [pathname])

  useEffect(() => {
    if (pathname === prevPath.current) return
    prevPath.current = pathname
    setCompleting(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      setVisible(false)
      setCompleting(false)
    }, 400)
    return () => clearTimeout(hideTimer.current)
  }, [pathname])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden pointer-events-none">
      {completing ? (
        <div className="h-full w-full bg-primary transition-all duration-300 ease-out" />
      ) : (
        <div
          className="h-full w-2/5 bg-primary rounded-full"
          style={{ animation: 'routeprogress 1.4s ease-in-out infinite' }}
        />
      )}
    </div>
  )
}
