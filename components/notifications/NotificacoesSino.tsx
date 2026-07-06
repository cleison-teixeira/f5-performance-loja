'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check } from 'lucide-react'
import Link from 'next/link'
import type { Notificacao } from '@/lib/notifications/types'

const SEV_DOT: Record<string, string> = {
  critico: 'bg-red-500',
  atencao: 'bg-amber-500',
  sucesso: 'bg-green-500',
  info:    'bg-blue-400',
}

const STORAGE_KEY = 'f5_notif_lidas_v1'

interface Props {
  notificacoes: Notificacao[]
}

export function NotificacoesSino({ notificacoes }: Props) {
  const [aberto, setAberto] = useState(false)
  const [lidas, setLidas] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setLidas(new Set(JSON.parse(saved) as string[]))
    } catch {}
  }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [aberto])

  // Fecha no Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function salvar(set: Set<string>) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])) } catch {}
  }

  function marcarUmaLida(id: string) {
    const next = new Set(lidas)
    next.add(id)
    setLidas(next)
    salvar(next)
  }

  function marcarTodasLidas() {
    const todas = new Set(notificacoes.map(n => n.id))
    setLidas(todas)
    salvar(todas)
  }

  const naoLidas = notificacoes.filter(n => !lidas.has(n.id)).length

  return (
    <div className="relative" ref={ref}>
      {/* Botão sino */}
      <button
        onClick={() => setAberto(v => !v)}
        aria-label="Notificações"
        className="relative flex items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1 leading-none pointer-events-none">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-xl shadow-xl border border-zinc-200 z-50 overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
            <span className="text-sm font-semibold text-zinc-900">
              Notificações
              {naoLidas > 0 && (
                <span className="ml-2 text-xs font-medium text-zinc-400">({naoLidas} nova{naoLidas > 1 ? 's' : ''})</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  className="text-xs text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Todas lidas
                </button>
              )}
              <button
                onClick={() => setAberto(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[380px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-zinc-400">Tudo certo por aqui.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {notificacoes.map(n => {
                  const isLida = lidas.has(n.id)
                  // lista_espera representa oportunidade ativa — nunca aparece como desabilitada
                  const visualLida = isLida && n.tipo !== 'lista_espera'
                  const dot = SEV_DOT[n.severidade] ?? SEV_DOT.info
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.url}
                        onClick={() => { marcarUmaLida(n.id); setAberto(false) }}
                        className={`flex gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors ${visualLida ? 'opacity-55' : ''}`}
                      >
                        <div className="shrink-0 pt-[5px]">
                          <span className={`block w-2 h-2 rounded-full ${visualLida ? 'bg-zinc-200' : dot}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm leading-snug ${visualLida ? 'font-normal text-zinc-500' : 'font-medium text-zinc-900'}`}>
                            {n.titulo}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{n.descricao}</p>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
