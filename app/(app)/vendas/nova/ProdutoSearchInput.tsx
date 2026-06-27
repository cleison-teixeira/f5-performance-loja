'use client'

import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { normalizarNome } from '@/lib/normalizar-nome'

export interface ProdutoCatalogoOpt {
  id: string
  nome: string
  preco_sugerido: number | null
  recorrente: boolean
  comissionavel_recompra: boolean
  ciclo_padrao?: number | null
}

export interface ProdutoSelecionadoResult {
  id: string | null
  nome: string
  preco_sugerido?: number | null
  recorrente?: boolean
  comissionavel_recompra?: boolean
  ciclo_padrao?: number | null
}

interface Props {
  produtos: ProdutoCatalogoOpt[]
  nome: string
  produtoId: string
  onSelect: (resultado: ProdutoSelecionadoResult) => void
  inputClass?: string
}

function fmtPreco(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const MAX_SUGESTOES = 8

export function ProdutoSearchInput({ produtos, nome, produtoId, onSelect, inputClass }: Props) {
  const [query, setQuery] = useState(nome)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(nome) }, [nome])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const normQ = normalizarNome(query)
  const sugestoes = open
    ? (normQ.length >= 1
        ? produtos.filter(p => normalizarNome(p.nome).includes(normQ)).slice(0, MAX_SUGESTOES)
        : produtos.slice(0, MAX_SUGESTOES))
    : []

  const isFromCatalog = !!produtoId
  const isNew = query.trim().length > 0 && !isFromCatalog

  function handleSelect(p: ProdutoCatalogoOpt) {
    setQuery(p.nome)
    setOpen(false)
    onSelect({
      id: p.id,
      nome: p.nome,
      preco_sugerido: p.preco_sugerido,
      recorrente: p.recorrente,
      comissionavel_recompra: p.comissionavel_recompra,
      ciclo_padrao: p.ciclo_padrao,
    })
  }

  function handleChange(val: string) {
    setQuery(val)
    if (!open) setOpen(true)
    const norm = normalizarNome(val)
    const exactMatch = val.trim().length > 0
      ? produtos.find(p => normalizarNome(p.nome) === norm)
      : null
    if (exactMatch) {
      onSelect({
        id: exactMatch.id,
        nome: exactMatch.nome,
        preco_sugerido: exactMatch.preco_sugerido,
        recorrente: exactMatch.recorrente,
        comissionavel_recompra: exactMatch.comissionavel_recompra,
        ciclo_padrao: exactMatch.ciclo_padrao,
      })
    } else {
      onSelect({ id: null, nome: val })
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Busque ou digite o nome do produto…"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className={inputClass}
      />

      {open && sugestoes.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-md overflow-hidden max-h-60 overflow-y-auto">
          {sugestoes.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(p) }}
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors"
            >
              <span className="flex-1 min-w-0 truncate">{p.nome}</span>
              {p.preco_sugerido != null && (
                <span className="flex-none text-xs text-muted-foreground tabular-nums">
                  {fmtPreco(p.preco_sugerido)}
                </span>
              )}
              {produtoId === p.id && <Check className="h-3.5 w-3.5 text-primary flex-none" />}
            </button>
          ))}
        </div>
      )}

      {isFromCatalog && (
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Check className="h-3 w-3" /> Produto do catálogo
        </p>
      )}
      {isNew && (
        <p className="mt-1 text-xs text-muted-foreground">
          Novo produto será criado na loja ao registrar a venda.
        </p>
      )}
    </div>
  )
}
