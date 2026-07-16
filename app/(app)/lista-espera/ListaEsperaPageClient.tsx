'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, CalendarDays } from 'lucide-react'
import { ListaEsperaCards, type RegistroListaEspera } from './ListaEsperaCards'
import { STATUS_LABELS } from './StatusBadge'
import { normalizarNome } from '@/lib/normalizar-nome'

interface Props {
  initialRegistros: RegistroListaEspera[]
  defaultLojaNome: string
  vendedoras: Array<{ id: string; nome: string }>
  produtos: Array<{ id: string; nome: string }>
  podeEditar: boolean
}

const STATUS_PRIORITY: Record<string, number> = {
  aguardando: 0, encontrado_outra_loja: 1, avisado: 2, convertido: 3, perdido: 4,
}

function chaveGrupo(r: RegistroListaEspera): string {
  return r.grupo_pedido_id
    ? `g:${r.grupo_pedido_id}`
    : `d:${r.loja_id}:${r.cliente_whatsapp}:${r.vendedora_id ?? ''}:${r.data_registro ?? r.criado_em.split('T')[0]}`
}

function statusPrincipalGrupo(itens: RegistroListaEspera[]): string {
  return itens.reduce((best, item) =>
    (STATUS_PRIORITY[item.status] ?? 99) < (STATUS_PRIORITY[best] ?? 99) ? item.status : best
  , itens[0].status)
}

function fmtData(iso: string) {
  const date = iso.includes('T') ? iso.split('T')[0] : iso
  const [ano, mes, dia] = date.split('-')
  return `${dia}/${mes}/${ano.slice(2)}`
}

const selectClass =
  'w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function ListaEsperaPageClient({
  initialRegistros,
  defaultLojaNome,
  vendedoras,
  produtos,
  podeEditar,
}: Props) {
  const [registros, setRegistros] = useState<RegistroListaEspera[]>(initialRegistros)
  const [busca, setBusca] = useState('')
  const [vendedoraFiltro, setVendedoraFiltro] = useState('')
  const [produtoFiltro, setProdutoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [dataFiltro, setDataFiltro] = useState('')

  useEffect(() => {
    setRegistros(initialRegistros)
  }, [initialRegistros])

  const produtosList = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of registros) {
      const key = r.produto_id ?? `nome:${normalizarNome(r.produto_nome)}`
      if (!map.has(key)) map.set(key, r.produto_nome)
    }
    return Array.from(map.entries())
      .map(([key, nome]) => ({ key, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [registros])

  const datasList = useMemo(() => {
    const set = new Set<string>()
    for (const r of registros) {
      if (r.data_registro) set.add(r.data_registro.split('T')[0])
    }
    return Array.from(set).sort().reverse()
  }, [registros])

  const registrosFiltrados = useMemo(() => {
    const buscaT = busca.trim()
    const hasFilter = buscaT !== '' || vendedoraFiltro !== '' || produtoFiltro !== '' || statusFiltro !== '' || dataFiltro !== ''
    if (!hasFilter) return registros

    const buscaNorm = normalizarNome(buscaT)

    const groupMap = new Map<string, RegistroListaEspera[]>()
    for (const r of registros) {
      const chave = chaveGrupo(r)
      const arr = groupMap.get(chave) ?? []
      arr.push(r)
      groupMap.set(chave, arr)
    }

    const chavesMatch = new Set<string>()

    for (const [chave, itens] of groupMap.entries()) {
      if (vendedoraFiltro && !itens.some(i => i.vendedora_id === vendedoraFiltro)) continue

      if (statusFiltro && statusPrincipalGrupo(itens) !== statusFiltro) continue

      if (dataFiltro) {
        const dataGrupo = itens.find(i => i.data_registro)?.data_registro?.split('T')[0] ?? null
        if (dataGrupo !== dataFiltro) continue
      }

      if (produtoFiltro) {
        const match = itens.some(i => {
          const key = i.produto_id ?? `nome:${normalizarNome(i.produto_nome)}`
          return key === produtoFiltro
        })
        if (!match) continue
      }

      if (buscaNorm) {
        const match = itens.some(i =>
          normalizarNome(i.cliente_nome).includes(buscaNorm) ||
          (i.cliente_whatsapp ?? '').includes(buscaNorm) ||
          normalizarNome(i.produto_nome).includes(buscaNorm) ||
          (i.observacao ? normalizarNome(i.observacao).includes(buscaNorm) : false)
        )
        if (!match) continue
      }

      chavesMatch.add(chave)
    }

    return registros.filter(r => chavesMatch.has(chaveGrupo(r)))
  }, [registros, busca, vendedoraFiltro, produtoFiltro, statusFiltro, dataFiltro])

  const temFiltro = busca.trim() !== '' || vendedoraFiltro !== '' || produtoFiltro !== '' || statusFiltro !== '' || dataFiltro !== ''

  function limparFiltros() {
    setBusca('')
    setVendedoraFiltro('')
    setProdutoFiltro('')
    setStatusFiltro('')
    setDataFiltro('')
  }

  const mostrarFiltroVendedora = vendedoras.length > 1
  const mostrarFiltroProduto = produtosList.length > 1
  const mostrarFiltroData = datasList.length > 0

  return (
    <div className="space-y-4">
      {registros.length > 0 && (
        <div className="space-y-2">
          {/* Busca livre */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente, WhatsApp ou produto..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Selects de filtro */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {mostrarFiltroVendedora && (
              <select
                value={vendedoraFiltro}
                onChange={e => setVendedoraFiltro(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos os responsáveis</option>
                {vendedoras.map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            )}

            {mostrarFiltroProduto && (
              <select
                value={produtoFiltro}
                onChange={e => setProdutoFiltro(e.target.value)}
                className={selectClass}
              >
                <option value="">Todos os produtos</option>
                {produtosList.map(p => (
                  <option key={p.key} value={p.key}>{p.nome}</option>
                ))}
              </select>
            )}

            <select
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value)}
              className={selectClass}
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            {mostrarFiltroData && (
              <div className="relative">
                <CalendarDays className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={dataFiltro}
                  onChange={e => setDataFiltro(e.target.value)}
                  className="w-full rounded-md border border-input bg-background pl-7 pr-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Data do pedido</option>
                  {datasList.map(d => (
                    <option key={d} value={d}>{fmtData(d)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {temFiltro && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {registrosFiltrados.length === 0
                  ? 'Nenhum pedido encontrado'
                  : `${registrosFiltrados.length} item${registrosFiltrados.length !== 1 ? 's' : ''} encontrado${registrosFiltrados.length !== 1 ? 's' : ''}`
                }
              </span>
              <button
                onClick={limparFiltros}
                className="text-primary underline underline-offset-2 hover:no-underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {temFiltro && registrosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Nenhum pedido encontrado com esses filtros.</p>
          <button
            onClick={limparFiltros}
            className="text-xs text-primary underline underline-offset-2 hover:no-underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ListaEsperaCards
          registros={registrosFiltrados}
          defaultLojaNome={defaultLojaNome}
          vendedoras={vendedoras}
          produtos={produtos}
          podeEditar={podeEditar}
        />
      )}
    </div>
  )
}
