'use client'

import { useState } from 'react'
import { CardAviso } from './CardAviso'
import type { AvisoDetalhado } from './types'
import type { CatalogoProduto } from './page'

interface AvisosListaProps {
  avisos: AvisoDetalhado[]
  hoje: string
  catalogo: CatalogoProduto[]
  percentuaisPorVendedora: Record<string, number>
  loja_id: string
}

type Periodo = 'hoje' | '7dias' | 'todos'
type TipoFiltro = 'todos' | AvisoDetalhado['tipo']

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7dias', label: 'Próximos 7 dias' },
  { value: 'todos', label: 'Todos' },
]

const TIPOS: { value: TipoFiltro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'agradecimento', label: 'Agradecimento' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'recompra', label: 'Recompra' },
  { value: 'oferta', label: 'Oferta' },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function AvisosLista({ avisos: avisosIniciais, hoje, catalogo, percentuaisPorVendedora, loja_id }: AvisosListaProps) {
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [tipo, setTipo] = useState<TipoFiltro>('todos')
  const [lista, setLista] = useState<AvisoDetalhado[]>(avisosIniciais)

  function handleMarcado(id: string) {
    setLista(prev => prev.filter(a => a.id !== id))
  }

  const limite7dias = addDays(hoje, 7)

  const avisosFiltrados = lista.filter(a => {
    const dentroDoPeríodo =
      periodo === 'hoje' ? a.data_aviso <= hoje :
      periodo === '7dias' ? a.data_aviso <= limite7dias :
      true

    const doTipo = tipo === 'todos' || a.tipo === tipo

    return dentroDoPeríodo && doTipo
  })

  const totalPeriodo = lista.filter(a =>
    periodo === 'hoje' ? a.data_aviso <= hoje :
    periodo === '7dias' ? a.data_aviso <= limite7dias :
    true
  ).length

  return (
    <div className="space-y-4">
      {/* Filtro de período */}
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {PERIODOS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriodo(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              periodo === value
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filtro de tipo */}
      <div className="flex flex-wrap gap-2">
        {TIPOS.map(({ value, label }) => {
          const count = lista.filter(a => {
            const dentroDoPeríodo =
              periodo === 'hoje' ? a.data_aviso <= hoje :
              periodo === '7dias' ? a.data_aviso <= limite7dias :
              true
            return dentroDoPeríodo && (value === 'todos' || a.tipo === value)
          }).length

          const ativo = tipo === value
          return (
            <button
              key={value}
              onClick={() => setTipo(value)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                ativo
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                    ativo ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {totalPeriodo === 0 ? (
        <p className="text-sm text-muted-foreground">
          {periodo === 'hoje' ? 'Nenhum aviso pendente para hoje.' : 'Nenhum aviso neste período.'}
        </p>
      ) : avisosFiltrados.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aviso do tipo selecionado.</p>
      ) : (
        <div className="space-y-3">
          {avisosFiltrados.map(aviso => (
            <CardAviso
              key={aviso.id}
              aviso={aviso}
              onMarcado={handleMarcado}
              catalogo={catalogo}
              percentualComissao={percentuaisPorVendedora[aviso.vendedora_id] ?? 0}
              loja_id={loja_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
