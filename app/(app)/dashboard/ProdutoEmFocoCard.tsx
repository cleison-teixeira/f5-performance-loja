import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'
import type { TopProdutoRecompra } from './page'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

interface Props {
  produto: TopProdutoRecompra
}

export function ProdutoEmFocoCard({ produto }: Props) {
  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/20 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">

          <div className="w-14 h-14 rounded-xl overflow-hidden flex-none border border-violet-200 dark:border-violet-800/40">
            {produto.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={produto.foto_url}
                alt={produto.nome}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-violet-100 dark:bg-violet-900/40">
                <Package className="h-6 w-6 text-violet-500" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-0.5">
              Produto em foco
            </p>
            <p className="text-base font-bold truncate">{produto.nome}</p>
            {produto.valorRecuperadoMes > 0 && (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {fmt(produto.valorRecuperadoMes)} em recompra este mês
              </p>
            )}
            <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-0.5">
              {produto.qtd} oportunidade{produto.qtd !== 1 ? 's' : ''} na fila
              {produto.qtdRecomprasMes > 0 && ` · ${produto.qtdRecomprasMes} recompra${produto.qtdRecomprasMes !== 1 ? 's' : ''} este mês`}
            </p>
          </div>
        </div>

        <Link
          href="/avisos"
          className="flex-none flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400 hover:underline mt-1"
        >
          Ver oportunidades <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="text-xs text-violet-600/70 dark:text-violet-400/70 mt-3 border-t border-violet-200/60 dark:border-violet-800/30 pt-3">
        Priorize este produto nas abordagens de recompra.
      </p>
    </div>
  )
}
