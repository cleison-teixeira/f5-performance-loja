'use client'

import { useTransition } from 'react'
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
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const selectClass =
  'rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

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
    <div className="space-y-3">
      {registros.map(r => (
        <RegistroCard key={r.id} registro={r} />
      ))}
    </div>
  )
}
