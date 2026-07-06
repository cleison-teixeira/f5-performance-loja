'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAceites } from '@/lib/aceites/actions'
import { ShieldCheck, ExternalLink } from 'lucide-react'

const SESSION_KEY = 'f5_aceite_adiado_v1'

interface Props {
  lojaId: string | null
}

export function ModalAceite({ lojaId }: Props) {
  const router = useRouter()
  const [visivel, setVisivel] = useState(false)
  const [aceitou, setAceitou] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    // Não mostra se o usuário já adiou nesta sessão
    const adiado = sessionStorage.getItem(SESSION_KEY)
    if (!adiado) setVisivel(true)
  }, [])

  function adiarPorSessao() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisivel(false)
  }

  async function handleAceitar() {
    if (!aceitou || salvando) return
    setSalvando(true)
    const res = await registrarAceites(lojaId)
    setSalvando(false)
    if (res.ok) {
      setVisivel(false)
      router.refresh()
    }
  }

  if (!visivel) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-[210] sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-xl shadow-2xl border border-border">
          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border">
            <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Documentos legais — F5 Recompra</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Para continuar usando a plataforma, leia e aceite os documentos abaixo.
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="px-5 py-4 space-y-2">
            {[
              { href: '/termos-de-uso', label: 'Termos de Uso' },
              { href: '/politica-de-privacidade', label: 'Política de Privacidade' },
              { href: '/contrato-lgpd', label: 'Acordo de Tratamento de Dados (LGPD)' },
            ].map(doc => (
              <a
                key={doc.href}
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-accent transition-colors"
              >
                <span className="font-medium">{doc.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
              </a>
            ))}
          </div>

          {/* Checkbox + botões */}
          <div className="px-5 pb-5 space-y-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                checked={aceitou}
                onChange={e => setAceitou(e.target.checked)}
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                Li e aceito os Termos de Uso, a Política de Privacidade e o Acordo de Tratamento de Dados do F5 Recompra.
              </span>
            </label>

            <button
              onClick={handleAceitar}
              disabled={!aceitou || salvando}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {salvando ? 'Registrando aceite…' : 'Aceitar e continuar'}
            </button>

            <button
              onClick={adiarPorSessao}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Revisar depois
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
