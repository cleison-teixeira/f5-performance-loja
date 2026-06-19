'use client'

import { useEffect, useState } from 'react'

interface StorageKey { key: string; preview: string }

export function DebugClientSection() {
  const [origin, setOrigin] = useState('')
  const [href, setHref] = useState('')
  const [sbKeys, setSbKeys] = useState<StorageKey[]>([])

  useEffect(() => {
    setOrigin(window.location.origin)
    setHref(window.location.href)

    const keys: StorageKey[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k.startsWith('sb-') || k.includes('supabase')) {
        const raw = localStorage.getItem(k) ?? ''
        // mostra apenas os primeiros 60 chars para não expor tokens
        keys.push({ key: k, preview: raw.slice(0, 60) + (raw.length > 60 ? '…' : '') })
      }
    }
    setSbKeys(keys)
  }, [])

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Browser (client-side)</p>

      <table className="w-full">
        <tbody>
          <tr className="border-b">
            <td className="py-2 pr-4 text-xs font-medium text-gray-500 whitespace-nowrap align-top">window.origin</td>
            <td className="py-2 text-xs font-mono break-all text-gray-800">{origin || '…'}</td>
          </tr>
          <tr className="border-b last:border-0">
            <td className="py-2 pr-4 text-xs font-medium text-gray-500 whitespace-nowrap align-top">window.href</td>
            <td className="py-2 text-xs font-mono break-all text-gray-800">{href || '…'}</td>
          </tr>
        </tbody>
      </table>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">localStorage (chaves Supabase)</p>
        {sbKeys.length === 0 ? (
          <p className="text-xs text-red-600 font-mono">nenhuma chave sb-* encontrada</p>
        ) : (
          <div className="space-y-1.5">
            {sbKeys.map((k, i) => (
              <div key={i} className="rounded-lg bg-gray-50 px-2 py-1.5">
                <p className="text-[11px] font-mono text-green-700 font-semibold">{k.key}</p>
                <p className="text-[10px] font-mono text-gray-400 break-all mt-0.5">{k.preview}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
