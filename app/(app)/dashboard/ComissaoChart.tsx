'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

interface Props {
  diasMes: string[]        // YYYY-MM-DD for each day of current month
  comissaoDiaria: number[] // value each day (index matches diasMes)
  metaValor: number | null
  hojeDia: number          // 1-based current day of month
  emptyTitle?: string
  emptyBody?: string
  showProgressBar?: boolean
}

export function ComissaoChart({ diasMes, comissaoDiaria, metaValor, hojeDia, emptyTitle, emptyBody, showProgressBar = true }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const n = diasMes.length
  const diasAteHoje = Math.min(hojeDia, n)

  // Build cumulative array
  const acumulado: number[] = []
  let running = 0
  for (let i = 0; i < diasAteHoje; i++) {
    running += comissaoDiaria[i] ?? 0
    acumulado.push(running)
  }

  const total = acumulado[acumulado.length - 1] ?? 0
  const meta = metaValor ?? 0
  const pct = meta > 0 ? Math.min(100, Math.round((total / meta) * 100)) : null

  // Empty state
  if (total === 0 && !metaValor) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 py-8 px-6">
        <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-muted-foreground/40" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-muted-foreground">{emptyTitle ?? 'Aguardando as primeiras recompras do mês'}</p>
          <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-[240px]">
            {emptyBody ?? 'A comissão acumulada aparecerá aqui quando houver recompras confirmadas.'}
          </p>
        </div>
      </div>
    )
  }

  const W = 400
  const H = 90
  const PX = 4
  const PY = 8
  const maxVal = Math.max(total, meta, 1)

  const xOf = (i: number) => PX + (diasAteHoje <= 1 ? W / 2 : (i / (diasAteHoje - 1)) * (W - PX * 2))
  const yOf = (v: number) => PY + (1 - v / maxVal) * (H - PY * 2)
  const metaY = meta > 0 ? yOf(meta) : null

  const pts = acumulado.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')
  const areaPath = `${xOf(0)},${H} ${acumulado.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} ${xOf(diasAteHoje - 1)},${H}`

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const i = Math.max(0, Math.min(diasAteHoje - 1, Math.round(relX * (diasAteHoje - 1))))
    setHover(i)
  }

  const hoverPct = hover !== null ? (xOf(hover) / W) * 100 : null
  const showLeft = (hoverPct ?? 0) > 55
  const lastY = acumulado.length > 0 ? yOf(total) : H / 2

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {meta > 0 && showProgressBar && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {fmt(total)} de {fmt(meta)}
            </span>
            <span className={`font-semibold ${pct !== null && pct >= 100 ? 'text-green-600' : 'text-foreground'}`}>
              {pct ?? 0}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${(pct ?? 0) >= 100 ? 'bg-green-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, pct ?? 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* SVG chart */}
      {total > 0 && (
        <div className="relative select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: '100px', display: 'block' }}
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            aria-hidden
          >
            <defs>
              <linearGradient id="gradComissao" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <line x1={PX} y1={H - 0.5} x2={W - PX} y2={H - 0.5} stroke="#e2e8f0" strokeWidth="0.5" />

            {/* Meta line */}
            {metaY !== null && (
              <>
                <line
                  x1={PX} y1={metaY} x2={W - PX} y2={metaY}
                  stroke="#94a3b8" strokeWidth="1" strokeDasharray="5 3" opacity="0.6"
                />
                <text x={W - PX - 2} y={metaY - 3} fontSize="8" fill="#94a3b8" textAnchor="end">meta</text>
              </>
            )}

            {/* Area + line */}
            <polygon points={areaPath} fill="url(#gradComissao)" />
            <polyline
              points={pts} fill="none"
              stroke="#10b981" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"
            />

            {/* End dot */}
            <circle cx={xOf(diasAteHoje - 1)} cy={lastY} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />

            {/* Hover */}
            {hover !== null && (
              <>
                <line
                  x1={xOf(hover)} y1={PY} x2={xOf(hover)} y2={H}
                  stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="3 2"
                />
                <circle cx={xOf(hover)} cy={yOf(acumulado[hover])} r="2.5" fill="#10b981" stroke="white" strokeWidth="1.2" />
              </>
            )}
          </svg>

          {/* Labels de data */}
          <div className="flex justify-between px-0.5 mt-1">
            <span className="text-[10px] text-muted-foreground">01/{diasMes[0]?.slice(5, 7)}</span>
            {diasAteHoje > 10 && (
              <span className="text-[10px] text-muted-foreground">
                {String(Math.round(diasAteHoje / 2)).padStart(2, '0')}/{diasMes[0]?.slice(5, 7)}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {String(diasAteHoje).padStart(2, '0')}/{diasMes[0]?.slice(5, 7)}
            </span>
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
                Dia {hover + 1}/{diasMes[0]?.slice(5, 7)}
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 flex-none" />
                  <span className="text-muted-foreground">Acumulado</span>
                </div>
                <span className="font-semibold text-foreground tabular-nums">{fmt(acumulado[hover])}</span>
              </div>
              {meta > 0 && (
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="text-muted-foreground">Meta</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{fmt(meta)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No commission but meta exists */}
      {total === 0 && meta > 0 && (
        <div className="rounded-xl border border-dashed bg-muted/20 py-4 px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Meta de {fmt(meta)} configurada — {emptyTitle ? emptyTitle.toLowerCase() : 'aguardando primeiras recompras'}
          </p>
        </div>
      )}
    </div>
  )
}
