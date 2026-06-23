import Link from 'next/link'
import { DollarSign, ChevronRight } from 'lucide-react'

interface Props {
  badge?: string
  valorPrincipal: string
  isEmpty: boolean
  zeroStateText: string
  subtexto: string
  ind1Label: string
  ind1Valor: string
  ind2Label: string
  ind2Valor: string
  ind3Label: string
  ind3Valor: string
  ctaLabel: string
  ctaHref: string
}

function MoneyIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 172 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="dnm-n1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#065f46" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="dnm-n2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="dnm-n3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <radialGradient id="dnm-ca" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="55%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <radialGradient id="dnm-cb" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="55%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <rect x="14" y="16" width="120" height="72" rx="9"
        fill="url(#dnm-n1)" opacity="0.70" transform="rotate(-15 74 52)" />
      <rect x="14" y="16" width="120" height="72" rx="9"
        fill="url(#dnm-n2)" opacity="0.86" transform="rotate(-6 74 52)" />
      <rect x="20" y="22" width="108" height="60" rx="6"
        fill="none" stroke="#34d399" strokeWidth="0.7" opacity="0.3" transform="rotate(-6 74 52)" />
      <rect x="14" y="16" width="120" height="72" rx="9" fill="url(#dnm-n3)" />
      <rect x="20" y="22" width="108" height="60" rx="6"
        fill="none" stroke="#a7f3d0" strokeWidth="0.8" opacity="0.45" />
      <circle cx="40" cy="52" r="14" fill="#059669" />
      <circle cx="40" cy="52" r="10" fill="none" stroke="#6ee7b7" strokeWidth="0.7" opacity="0.45" />
      <line x1="62" y1="33" x2="116" y2="33" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="41" x2="116" y2="41" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="49" x2="116" y2="49" stroke="#a7f3d0" strokeWidth="1.1" opacity="0.45" />
      <line x1="62" y1="57" x2="110" y2="57" stroke="#a7f3d0" strokeWidth="1" opacity="0.4" />
      <line x1="62" y1="65" x2="98" y2="65" stroke="#a7f3d0" strokeWidth="0.9" opacity="0.35" />
      <rect x="20" y="20" width="13" height="8" rx="2" fill="#047857" opacity="0.65" />
      <rect x="115" y="60" width="13" height="8" rx="2" fill="#047857" opacity="0.65" />
      <circle cx="106" cy="120" r="16" fill="url(#dnm-cb)" opacity="0.82" />
      <circle cx="106" cy="120" r="16" fill="none" stroke="#d97706" strokeWidth="0.8" opacity="0.45" />
      <circle cx="102" cy="116" r="7" fill="white" opacity="0.07" />
      <circle cx="150" cy="106" r="12" fill="url(#dnm-cb)" opacity="0.88" />
      <circle cx="150" cy="106" r="12" fill="none" stroke="#f59e0b" strokeWidth="0.7" opacity="0.5" />
      <circle cx="147" cy="103" r="5" fill="white" opacity="0.09" />
      <circle cx="126" cy="112" r="21" fill="url(#dnm-ca)" />
      <circle cx="126" cy="112" r="21" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.6" />
      <circle cx="121" cy="107" r="9" fill="white" opacity="0.10" />
    </svg>
  )
}

export function DinheiroNaMesaHero({
  badge,
  valorPrincipal,
  isEmpty,
  zeroStateText,
  subtexto,
  ind1Label,
  ind1Valor,
  ind2Label,
  ind2Valor,
  ind3Label,
  ind3Valor,
  ctaLabel,
  ctaHref,
}: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden shadow-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 via-[#0d4a2e] to-[#081f14]" />
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-green-600/10 blur-2xl pointer-events-none" />
      <div className="absolute top-1/2 -left-10 w-36 h-36 rounded-full bg-emerald-400/8 blur-2xl pointer-events-none" />

      <div className="relative p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center flex-none">
              <DollarSign className="h-4 w-4 text-emerald-300" />
            </div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300/90">
              Dinheiro na Mesa
            </span>
          </div>
          {badge && (
            <div className="bg-white/10 ring-1 ring-white/15 rounded-full px-3.5 py-1 text-xs font-semibold text-white/80">
              {badge}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-10">
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-5xl md:text-6xl font-bold tabular-nums text-white leading-none tracking-tight">
                {valorPrincipal}
              </p>
              <p className="text-sm text-emerald-300/70 mt-2.5 font-medium">
                {subtexto}
              </p>
              {isEmpty && (
                <p className="text-sm text-white/40 mt-2 italic">
                  {zeroStateText}
                </p>
              )}
            </div>

            <div className="h-px bg-white/10" />

            <div className="grid grid-cols-3 gap-x-6">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">{ind1Label}</p>
                <p className="text-2xl font-bold text-white tabular-nums">{ind1Valor}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">{ind2Label}</p>
                <p className="text-2xl font-bold text-white tabular-nums">{ind2Valor}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.12em] mb-1.5">{ind3Label}</p>
                <p className="text-2xl font-bold text-white tabular-nums">{ind3Valor}</p>
              </div>
            </div>

            <div className="md:hidden">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 bg-white text-emerald-900 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
              >
                {ctaLabel}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end justify-between gap-4 w-36 lg:w-44 flex-none">
            <MoneyIllustration className="w-full opacity-80" />
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-white text-emerald-900 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
            >
              {ctaLabel}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
