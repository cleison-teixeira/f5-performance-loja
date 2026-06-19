'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

interface Props {
  vendas: number[]
  recompras: number[]
  labels: string[]
}

export function TrendChart({ vendas, recompras, labels }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  // Converte valores diários em acumulados — evita picos isolados
  const cumVendas = vendas.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] ?? 0) + v)
    return acc
  }, [])

  const cumRecompras = recompras.reduce<number[]>((acc, v) => {
    acc.push((acc[acc.length - 1] ?? 0) + v)
    return acc
  }, [])

  const totalRecompras = cumRecompras[cumRecompras.length - 1] ?? 0
  const totalVendas = cumVendas[cumVendas.length - 1] ?? 0

  // Empty state: sem recompras no período (vendas sozinhas não geram o gráfico)
  if (totalRecompras === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 py-8 px-6">
        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">Ainda não há recompras registradas</p>
          <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-[240px]">
            Quando os primeiros clientes voltarem a comprar, a evolução aparecerá aqui.
          </p>
        </div>
      </div>
    )
  }

  const n = cumRecompras.length
  // Usa o máximo combinado — vendas podem ser maiores que recompras
  const maxVal = Math.max(totalVendas, totalRecompras, 1)

  const W = 400
  const H = 90
  const PX = 4
  const PY = 8

  const xOf = (i: number) => PX + (n <= 1 ? W / 2 : (i / (n - 1)) * (W - PX * 2))
  const yOf = (v: number) => PY + (1 - v / maxVal) * (H - PY * 2)

  const vPts = cumVendas.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')
  const rPts = cumRecompras.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')
  const rArea = `${PX},${H} ${cumRecompras.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} ${xOf(n - 1)},${H}`
  const vArea = `${PX},${H} ${cumVendas.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} ${xOf(n - 1)},${H}`

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const i = Math.max(0, Math.min(n - 1, Math.round(relX * (n - 1))))
    setHover(i)
  }

  const hoverPct = hover !== null ? (xOf(hover) / W) * 100 : null
  const showLeft = (hoverPct ?? 0) > 55

  const lastR = cumRecompras[n - 1]
  const lastV = cumVendas[n - 1]

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: '110px', display: 'block' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        aria-hidden
      >
        <defs>
          <linearGradient id="grCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gvCum" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Linha de base */}
        <line x1={PX} y1={H - 0.5} x2={W - PX} y2={H - 0.5} stroke="#e2e8f0" strokeWidth="0.5" />

        {/* Vendas acumuladas — secundário, linha tracejada mais suave */}
        <polygon points={vArea} fill="url(#gvCum)" />
        <polyline
          points={vPts} fill="none"
          stroke="#f59e0b" strokeWidth="1.2"
          strokeLinejoin="round" strokeLinecap="round"
          strokeDasharray="4 3" opacity="0.55"
        />

        {/* Recompras acumuladas — linha principal verde crescente */}
        <polygon points={rArea} fill="url(#grCum)" />
        <polyline
          points={rPts} fill="none"
          stroke="#10b981" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Ponto final — recompras */}
        <circle cx={xOf(n - 1)} cy={yOf(lastR)} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
        {/* Ponto final — vendas (menor, transparente) */}
        <circle cx={xOf(n - 1)} cy={yOf(lastV)} r="2" fill="#f59e0b" stroke="white" strokeWidth="1" opacity="0.6" />

        {/* Hover */}
        {hover !== null && (
          <>
            <line
              x1={xOf(hover)} y1={PY} x2={xOf(hover)} y2={H}
              stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="3 2"
            />
            <circle cx={xOf(hover)} cy={yOf(cumRecompras[hover])} r="2.5" fill="#10b981" stroke="white" strokeWidth="1.2" />
            <circle cx={xOf(hover)} cy={yOf(cumVendas[hover])} r="2" fill="#f59e0b" stroke="white" strokeWidth="1" opacity="0.7" />
          </>
        )}
      </svg>

      {/* Labels de data */}
      <div className="flex justify-between px-0.5 mt-1">
        <span className="text-[10px] text-muted-foreground">{labels[0]?.slice(5).replace('-', '/')}</span>
        <span className="text-[10px] text-muted-foreground">{labels[14]?.slice(5).replace('-', '/')}</span>
        <span className="text-[10px] text-muted-foreground">{labels[29]?.slice(5).replace('-', '/')}</span>
      </div>

      {/* Tooltip */}
      {hover !== null && hoverPct !== null && (
        <div
          className="absolute top-0 z-20 pointer-events-none bg-popover border shadow-xl rounded-xl p-3 text-xs min-w-[160px]"
          style={{
            left: `${hoverPct}%`,
            transform: showLeft ? 'translateX(calc(-100% - 6px))' : 'translateX(8px)',
          }}
        >
          <p className="text-muted-foreground font-medium mb-2">
            {labels[hover]?.slice(5).replace('-', '/')}
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
                <span className="text-muted-foreground">Recompras</span>
              </div>
              <span className="font-semibold text-foreground tabular-nums">{fmt(cumRecompras[hover])}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 flex-none opacity-60" />
                <span className="text-muted-foreground">Vendas</span>
              </div>
              <span className="font-medium text-foreground/70 tabular-nums">{fmt(cumVendas[hover])}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mt-2">acumulado até esta data</p>
        </div>
      )}
    </div>
  )
}
