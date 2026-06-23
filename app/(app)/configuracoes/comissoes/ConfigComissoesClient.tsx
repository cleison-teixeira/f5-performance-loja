'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FormComissoes } from './FormComissoes'
import { FormMetaMensal } from './FormMetaMensal'
import { FormComissaoFixaProduto } from './FormComissaoFixaProduto'
import type { VendedoraComissao } from './page'
import type { VendedoraMeta } from './FormMetaMensal'
import type { RegraFixa } from './FormComissaoFixaProduto'

type Aba = 'padrao' | 'metas' | 'produto'

interface Props {
  vendedoras: VendedoraComissao[]
  vendedorasMeta: VendedoraMeta[]
  regrasFixas: RegraFixa[]
  produtos: { id: string; nome: string }[]
  vendedorasSimples: { id: string; nome: string }[]
  loja_id: string
  mes: string
  mesLabel: string
}

const abas: { id: Aba; label: string }[] = [
  { id: 'padrao', label: 'Comissão padrão' },
  { id: 'metas', label: 'Metas mensais' },
  { id: 'produto', label: 'Por produto' },
]

export function ConfigComissoesClient({
  vendedoras,
  vendedorasMeta,
  regrasFixas,
  produtos,
  vendedorasSimples,
  loja_id,
  mes,
  mesLabel,
}: Props) {
  const [aba, setAba] = useState<Aba>('padrao')

  return (
    <div className="space-y-5">
      <div className="flex rounded-lg border overflow-x-auto text-sm">
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'flex-1 shrink-0 px-3 py-2.5 text-center transition-colors whitespace-nowrap touch-manipulation',
              aba === a.id
                ? 'bg-primary text-primary-foreground font-medium'
                : 'bg-background hover:bg-accent text-foreground'
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'padrao' && (
        <FormComissoes vendedoras={vendedoras} loja_id={loja_id} podeEditar />
      )}

      {aba === 'metas' && (
        <FormMetaMensal
          vendedoras={vendedorasMeta}
          loja_id={loja_id}
          mes={mes}
          mesLabel={mesLabel}
        />
      )}

      {aba === 'produto' && (
        <FormComissaoFixaProduto
          regras={regrasFixas}
          produtos={produtos}
          vendedoras={vendedorasSimples}
          loja_id={loja_id}
        />
      )}
    </div>
  )
}
