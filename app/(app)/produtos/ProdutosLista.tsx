'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'

export type ProdutoCard = {
  id: string
  nome: string
  preco_sugerido: number | null
  foto_url: string | null
  recorrente: boolean
  qtd_mensagens: number | null
  loja_id: string
  lojaNome: string | null
  mensagens_produto: Array<{ tipo: string; dias_apos_venda: number }>
}

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cicloRecompra(mensagens: Array<{ tipo: string; dias_apos_venda: number }>): number | null {
  if (mensagens.length === 0) return null
  const recompra = mensagens.find(m => m.tipo === 'recompra')
  if (recompra) return recompra.dias_apos_venda
  return Math.max(...mensagens.map(m => m.dias_apos_venda))
}

interface Props {
  lista: ProdutoCard[]
  podeEditar: boolean
}

export function ProdutosLista({ lista, podeEditar }: Props) {
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return lista
    return lista.filter(p => p.nome.toLowerCase().includes(q))
  }, [lista, busca])

  return (
    <div className="space-y-4">
      {lista.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto…"
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-2">
          <p className="text-sm font-medium">Nenhum produto ativo cadastrado.</p>
          {podeEditar && (
            <p className="text-xs text-muted-foreground">
              Cadastre produtos em{' '}
              <Link href="/configuracoes/produtos" className="text-primary hover:underline">
                Produtos e mensagens
              </Link>.
            </p>
          )}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum produto encontrado para <strong>&ldquo;{busca}&rdquo;</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(p => {
            const mensagens = Array.isArray(p.mensagens_produto) ? p.mensagens_produto : []
            const dias = p.recorrente ? cicloRecompra(mensagens) : null
            const qtd = p.qtd_mensagens ?? mensagens.length

            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-2.5">
                <div className="flex items-start gap-3">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_url}
                      alt={p.nome}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-sm font-semibold">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{p.nome}</p>
                      {p.preco_sugerido != null && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                          {formatarBRL(p.preco_sugerido)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {p.recorrente ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Recompra
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Pontual
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        Ativo
                      </span>
                      {p.lojaNome && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {p.lojaNome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.recorrente && (
                  <div className="text-xs text-muted-foreground border-t pt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {dias != null ? (
                      <span>
                        Recompra em{' '}
                        <strong className="text-foreground">{dias} dias</strong>
                      </span>
                    ) : (
                      <span>Sem ciclo de recompra definido</span>
                    )}
                    {qtd > 0 ? (
                      <span>
                        {qtd} aviso{qtd !== 1 ? 's' : ''} configurado{qtd !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span>Sem avisos configurados</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
