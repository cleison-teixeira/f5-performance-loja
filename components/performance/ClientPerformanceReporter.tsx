'use client'

import { useEffect } from 'react'

export function ClientPerformanceReporter() {
  useEffect(() => {
    const enabled =
      process.env.NEXT_PUBLIC_PERFORMANCE_LOGS === 'true' ||
      new URLSearchParams(window.location.search).get('perf') === '1'

    if (!enabled) return

    const route = window.location.pathname

    function report() {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (nav) {
        const ttfb = Math.round(nav.responseStart - nav.startTime)
        const domInteractive = Math.round(nav.domInteractive - nav.startTime)
        const domComplete = Math.round(nav.domComplete - nav.startTime)
        const loadEvent = Math.round(nav.loadEventEnd - nav.startTime)
        console.log(`[CLIENT-PERF] route=${route} TTFB=${ttfb}ms domInteractive=${domInteractive}ms domComplete=${domComplete}ms loadEvent=${loadEvent}ms`)
      }

      const paintEntries = performance.getEntriesByType('paint')
      for (const e of paintEntries) {
        if (e.name === 'first-contentful-paint') {
          console.log(`[CLIENT-PERF] route=${route} FCP=${Math.round(e.startTime)}ms`)
        }
      }
    }

    if (document.readyState === 'complete') {
      report()
    } else {
      window.addEventListener('load', report, { once: true })
    }

    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) console.log(`[CLIENT-PERF] route=${route} LCP=${Math.round(last.startTime)}ms`)
    })
    try { lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true }) } catch { /* unsupported */ }

    return () => {
      try { lcpObserver.disconnect() } catch { /* noop */ }
    }
  }, [])

  return null
}
