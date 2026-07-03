'use client'
import { useEffect } from 'react'
import { limparPinGestaoUnlock } from '@/lib/pin/guard-actions'

interface Props {
  scope: string
}

// Renderiza null mas limpa o unlock desta rota quando desmonta (usuário sai da tela)
export function PinGestaoUnlockWatcher({ scope }: Props) {
  useEffect(() => {
    return () => {
      limparPinGestaoUnlock(scope).catch(() => {})
    }
  }, [scope])

  return null
}
