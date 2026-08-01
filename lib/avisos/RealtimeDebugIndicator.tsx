'use client'

import type { DiagnosticoRealtime } from './useAvisosRealtime'

const ROTULO: Record<DiagnosticoRealtime['status'], string> = {
  conectando: 'Conectando',
  conectado: 'Conectado',
  erro: 'Erro',
  tempo_esgotado: 'Tempo esgotado',
  desconectado: 'Desconectado',
}

const COR: Record<DiagnosticoRealtime['status'], string> = {
  conectando: '#a3a3a3',
  conectado: '#16a34a',
  erro: '#dc2626',
  tempo_esgotado: '#ea580c',
  desconectado: '#737373',
}

// Diagnóstico temporário (PILOT-0003C) — só aparece quando
// NEXT_PUBLIC_MOSTRAR_DEBUG_REALTIME=1, variável setada apenas no
// Preview de staging, nunca em produção.
export function RealtimeDebugIndicator({ diagnostico }: { diagnostico: DiagnosticoRealtime }) {
  if (process.env.NEXT_PUBLIC_MOSTRAR_DEBUG_REALTIME !== '1') return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 9999,
        fontSize: 11,
        fontFamily: 'monospace',
        background: '#18181b',
        color: '#fff',
        padding: '4px 8px',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        opacity: 0.85,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: COR[diagnostico.status], display: 'inline-block' }} />
      Realtime: {ROTULO[diagnostico.status]} ({diagnostico.tentativas})
    </div>
  )
}
