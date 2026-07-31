'use client'

import { useEffect, useRef, useState } from 'react'

// Causa raiz (PILOT-0002): uma vez carregado, o bundle JS de uma aba/PWA
// instalado nunca é substituído sozinho — nem por navegação client-side do
// Next.js Router (comprovado por reprodução), nem pelo simples fato de o
// servidor já servir uma versão nova. Só um reload real do documento troca
// o código em execução. Este componente detecta ativamente a divergência
// entre a versão carregada e a versão publicada, e dá controle explícito
// ao usuário — nunca recarrega sozinho, para não descartar dado em
// preenchimento silenciosamente.

const INTERVALO_VERIFICACAO_MS = 5 * 60 * 1000 // 5 minutos

interface Props {
  versaoAtual: string
}

export function AppUpdateChecker({ versaoAtual }: Props) {
  const [novaVersaoDisponivel, setNovaVersaoDisponivel] = useState(false)
  const jaDetectouRef = useRef(false)

  useEffect(() => {
    // 'dev' (ambiente local, sem VERCEL_GIT_COMMIT_SHA) nunca dispara aviso —
    // não há versão de referência confiável para comparar.
    if (versaoAtual === 'dev') return

    async function verificar() {
      if (jaDetectouRef.current) return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { versao } = await res.json()
        if (versao && versao !== versaoAtual) {
          jaDetectouRef.current = true
          setNovaVersaoDisponivel(true)
        }
      } catch {
        // Falha de rede não deve gerar ruído — só tenta de novo no próximo ciclo.
      }
    }

    // Verificação periódica.
    const intervalo = setInterval(verificar, INTERVALO_VERIFICACAO_MS)

    // Verificação ao voltar o foco — cobre exatamente o caso do atalho/PWA
    // instalado que fica em segundo plano e volta ao primeiro plano sem
    // passar por uma navegação de rede nova.
    function aoFicarVisivel() {
      if (document.visibilityState === 'visible') verificar()
    }
    document.addEventListener('visibilitychange', aoFicarVisivel)
    window.addEventListener('focus', verificar)

    // Se o Service Worker trocar de controller (uma versão futura dele
    // passar a cachear algo e depois for atualizada), trata como o mesmo
    // sinal de "há versão nova" em vez de recarregar sozinho.
    let swListener: (() => void) | undefined
    if ('serviceWorker' in navigator) {
      swListener = () => { jaDetectouRef.current = true; setNovaVersaoDisponivel(true) }
      navigator.serviceWorker.addEventListener('controllerchange', swListener)
    }

    verificar()

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoFicarVisivel)
      window.removeEventListener('focus', verificar)
      if (swListener) navigator.serviceWorker.removeEventListener('controllerchange', swListener)
    }
  }, [versaoAtual])

  if (!novaVersaoDisponivel) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm rounded-lg border bg-background shadow-lg px-4 py-3 flex items-center gap-3">
      <p className="flex-1 text-sm">Uma nova versão do F5 está disponível.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Atualizar agora
      </button>
    </div>
  )
}
