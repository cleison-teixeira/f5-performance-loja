'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusListaEspera, type StatusListaEspera } from './actions'
import { StatusBadge, STATUS_LABELS } from './StatusBadge'

export interface RegistroListaEspera {
  id: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  categoria_nome: string | null
  valor_potencial: number | null
  quantidade: number
  status: string
  observacao: string | null
  criado_em: string
  vendedora_nome?: string
  loja_nome?: string
}

type GrupoProduto = {
  key: string
  produto_nome: string
  qtd: number
  qtdAguardando: number
  valorPotencial: number
  lojas: string[]
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const selectClass =
  'rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function normalizarNome(nome: string) {
  return nome.trim().toLowerCase()
}

function RegistroCard({ registro }: { registro: RegistroListaEspera }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleStatus(valor: string) {
    startTransition(async () => {
      await atualizarStatusListaEspera(registro.id, valor as StatusListaEspera)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{registro.produto_nome}</p>
          {registro.categoria_nome && (
            <p className="text-xs text-muted-foreground mt-0.5">{registro.categoria_nome}</p>
          )}
        </div>
        <StatusBadge status={registro.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-muted-foreground">Cliente</p>
          <p className="font-medium truncate">{registro.cliente_nome}</p>
        </div>
        <div>
          <p className="text-muted-foreground">WhatsApp</p>
          <p className="font-medium">{registro.cliente_whatsapp}</p>
        </div>
        {registro.valor_potencial !== null && (
          <div>
            <p className="text-muted-foreground">Valor potencial</p>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              {fmtValor(registro.valor_potencial)}
            </p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Qtd</p>
          <p className="font-medium">{registro.quantidade}</p>
        </div>
        {registro.vendedora_nome && (
          <div>
            <p className="text-muted-foreground">Vendedora</p>
            <p className="font-medium truncate">{registro.vendedora_nome}</p>
          </div>
        )}
        {registro.loja_nome && (
          <div>
            <p className="text-muted-foreground">Loja</p>
            <p className="font-medium truncate">{registro.loja_nome}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Cadastrado</p>
          <p className="font-medium">{fmtData(registro.criado_em)}</p>
        </div>
      </div>

      {registro.observacao && (
        <p className="text-xs text-muted-foreground border-t pt-2 leading-relaxed">
          {registro.observacao}
        </p>
      )}

      <div className="flex items-center gap-2 border-t pt-2">
        <span className="text-xs text-muted-foreground shrink-0">Status:</span>
        <select
          className={selectClass}
          value={registro.status}
          onChange={e => handleStatus(e.target.value)}
          disabled={isPending}
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {isPending && (
          <span className="text-xs text-muted-foreground">Salvando…</span>
        )}
      </div>
    </div>
  )
}

interface Props {
  registros: RegistroListaEspera[]
}

export function ListaEsperaCards({ registros }: Props) {
  const [produtoFiltro, setProdutoFiltro] = useState('')

  const grupos = useMemo<GrupoProduto[]>(() => {
    const map = new Map<string, GrupoProduto>()
    for (const r of registros) {
      const key = normalizarNome(r.produto_nome)
      const entry = map.get(key) ?? {
        key,
        produto_nome: r.produto_nome,
        qtd: 0,
        qtdAguardando: 0,
        valorPotencial: 0,
        lojas: [],
      }
      entry.qtd++
      if (r.status === 'aguardando') entry.qtdAguardando++
      entry.valorPotencial += r.valor_potencial ?? 0
      if (r.loja_nome && !entry.lojas.includes(r.loja_nome)) entry.lojas.push(r.loja_nome)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort(
      (a, b) => b.qtdAguardando - a.qtdAguardando || b.qtd - a.qtd
    )
  }, [registros])

  const filtrados = useMemo(() => {
    if (!produtoFiltro) return registros
    return registros.filter(r => normalizarNome(r.produto_nome) === produtoFiltro)
  }, [registros, produtoFiltro])

  if (registros.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center space-y-2">
        <p className="text-sm font-medium">Nenhuma oportunidade em espera ainda.</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
          Quando um cliente pedir algo que não tem na loja, cadastre aqui para não perder a venda.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Listas por produto ── */}
      {grupos.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Listas por produto
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {grupos.map(g => (
              <button
                key={g.key}
                onClick={() => setProdutoFiltro(produtoFiltro === g.key ? '' : g.key)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  produtoFiltro === g.key
                    ? 'border-primary bg-primary/5'
                    : 'bg-card hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug line-clamp-2 flex-1">
                    {g.produto_nome}
                  </p>
                  {g.qtdAguardando > 0 && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                      {g.qtdAguardando} aguardando
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{g.qtd} cliente{g.qtd !== 1 ? 's' : ''}</span>
                  {g.valorPotencial > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {fmtValor(g.valorPotencial)}
                    </span>
                  )}
                  {g.lojas.map(l => (
                    <span key={l} className="font-medium text-foreground/70">{l}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtro por produto ── */}
      {grupos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setProdutoFiltro('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !produtoFiltro
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-transparent text-foreground hover:bg-accent'
            }`}
          >
            Todos ({registros.length})
          </button>
          {grupos.map(g => (
            <button
              key={g.key}
              onClick={() => setProdutoFiltro(produtoFiltro === g.key ? '' : g.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                produtoFiltro === g.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-transparent text-foreground hover:bg-accent'
              }`}
            >
              {g.produto_nome} ({g.qtd})
            </button>
          ))}
        </div>
      )}

      {/* ── Cards de clientes ── */}
      {filtrados.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Nenhum item para este produto.
        </p>
      ) : (
        <div className="space-y-3">
          {filtrados.map(r => (
            <RegistroCard key={r.id} registro={r} />
          ))}
        </div>
      )}
    </div>
  )
}
