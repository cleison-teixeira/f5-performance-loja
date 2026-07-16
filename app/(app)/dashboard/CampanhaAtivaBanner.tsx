import Link from 'next/link'
import { ShoppingCart, Target, TrendingUp, ChevronRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { buscarCampanhaAtivaDashboard, buscarCampanhaAtivaGestao } from '../campanhas/actions'

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// ─── Card do vendedor ─────────────────────────────────────────────────────────
export async function CampanhaCardVendedor({ lojaId, perfilId }: { lojaId: string; perfilId: string }) {
  const dados = await buscarCampanhaAtivaDashboard(lojaId, perfilId)
  if (!dados) return null

  const { campanha, metaIndividual, unidadesHoje } = dados
  const isDiaria = campanha.periodicidade === 'diaria'
  const meta = isDiaria ? metaIndividual : campanha.meta_individual
  const label = campanha.unidade_meta === 'pacote' ? 'pacote' : 'unidade'
  const labelPlural = campanha.unidade_meta === 'pacote' ? 'pacotes' : 'unidades'

  const falta = meta != null ? Math.max(0, meta - unidadesHoje) : null
  const pct = meta != null && meta > 0 ? Math.min(Math.round((unidadesHoje / meta) * 100), 999) : null

  const itensAtivos = campanha.itens.filter(i => i.ativo)
  const vendaQuery = itensAtivos.length === 1
    ? `?produto_id=${itensAtivos[0].produto_id}&campanha_id=${campanha.id}`
    : `?campanha_id=${campanha.id}`

  return (
    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Campanha ativa</p>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-0.5">{campanha.nome}</p>
          </div>
          <Link href={`/campanhas/${campanha.id}`} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40">
            <ChevronRight className="h-4 w-4 text-amber-600" />
          </Link>
        </div>

        {isDiaria && meta != null ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{unidadesHoje}</p>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">Vendido hoje</p>
            </div>
            <div>
              <p className="text-xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{meta}</p>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">Meta de hoje</p>
            </div>
            <div>
              {unidadesHoje >= meta ? (
                <>
                  <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">✓</p>
                  <p className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
                    {pct != null && pct > 100 ? `${pct}% da meta` : 'Meta atingida'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{falta}</p>
                  <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                    Falta{falta === 1 ? '' : 'm'}
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {unidadesHoje} {unidadesHoje === 1 ? label : labelPlural} vendido{unidadesHoje !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                {itensAtivos.length} produto{itensAtivos.length !== 1 ? 's' : ''} participante{itensAtivos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-amber-200 dark:border-amber-800 px-4 py-2.5">
        <Link
          href={`/vendas/nova${vendaQuery}`}
          className="flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200 hover:underline"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Registrar venda da campanha
        </Link>
      </div>
    </div>
  )
}

// ─── Card do gestor ───────────────────────────────────────────────────────────
export async function CampanhaCardGestor({ lojaId }: { lojaId: string }) {
  const dados = await buscarCampanhaAtivaGestao(lojaId)
  if (!dados) return null

  const { campanha, unidadesHoje, metaLojaHoje, porParticipante } = dados
  const label = campanha.unidade_meta === 'pacote' ? 'pacotes' : 'unidades'
  const pct = metaLojaHoje && metaLojaHoje > 0 ? Math.min(Math.round((unidadesHoje / metaLojaHoje) * 100), 999) : null

  return (
    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Campanha ativa</p>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-0.5">{campanha.nome}</p>
          </div>
          <Link href={`/campanhas/${campanha.id}`} className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-1 text-xs text-amber-700">
            Ver <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/20 p-2.5 text-center">
            <p className="text-xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{unidadesHoje}</p>
            <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
              {label} hoje
            </p>
          </div>
          <div className="rounded-lg bg-amber-100/60 dark:bg-amber-900/20 p-2.5 text-center">
            {metaLojaHoje != null ? (
              <>
                <p className={`text-xl font-bold tabular-nums ${pct != null && pct >= 100 ? 'text-emerald-600' : 'text-amber-800 dark:text-amber-200'}`}>
                  {pct ?? 0}%
                </p>
                <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">meta ({metaLojaHoje} {label})</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold tabular-nums text-amber-800 dark:text-amber-200">{campanha.itens.filter(i => i.ativo).length}</p>
                <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">produtos</p>
              </>
            )}
          </div>
        </div>

        {porParticipante.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-amber-700/70 dark:text-amber-400/70 uppercase tracking-wide">Ranking hoje</p>
            {porParticipante.slice(0, 3).map((p, idx) => (
              <div key={p.perfilId} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-center font-bold text-amber-700/70">{idx + 1}.</span>
                <span className="flex-1 truncate text-amber-800 dark:text-amber-200">{p.nome}</span>
                <span className="font-bold text-amber-800 dark:text-amber-200 tabular-nums">{p.unidades}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
