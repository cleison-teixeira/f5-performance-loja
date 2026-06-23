'use client'

import { useState } from 'react'
import { confirmarRecompra } from './actions'
import type { AvisoDetalhado } from './types'
import type { CatalogoProduto } from './page'
import { Plus, X } from 'lucide-react'

interface Props {
  aviso: AvisoDetalhado
  catalogo: CatalogoProduto[]
  percentualComissao: number
  loja_id: string
  onSucesso: (aviso_id: string) => void
  onFechar: () => void
}

interface ItemForm {
  key: string
  produtoId: string
  produtoNome: string
  quantidade: number
  precoBRL: string
  comissionavel: boolean
}

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
}

function formatarBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function ConfirmarRecompraModal({
  aviso,
  catalogo,
  percentualComissao,
  loja_id,
  onSucesso,
  onFechar,
}: Props) {
  // Pré-preenche com o produto do aviso
  const produtoInicial = catalogo.find(p => p.id === aviso.produto_id)

  function criarItemInicial(): ItemForm {
    return {
      key: crypto.randomUUID(),
      produtoId: aviso.produto_id ?? '',
      produtoNome: aviso.produto_nome,
      quantidade: 1,
      precoBRL: produtoInicial?.preco_sugerido != null
        ? produtoInicial.preco_sugerido.toFixed(2).replace('.', ',')
        : '',
      comissionavel: produtoInicial?.comissionavel_recompra ?? true,
    }
  }

  const [itens, setItens] = useState<ItemForm[]>([criarItemInicial()])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function atualizar(key: string, patch: Partial<ItemForm>) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  }

  function handleProdutoChange(key: string, produtoId: string) {
    const prod = catalogo.find(p => p.id === produtoId)
    atualizar(key, {
      produtoId,
      produtoNome: prod?.nome ?? '',
      precoBRL: prod?.preco_sugerido != null ? prod.preco_sugerido.toFixed(2).replace('.', ',') : '',
      comissionavel: prod?.comissionavel_recompra ?? true,
    })
  }

  function handlePrecoBlur(key: string, raw: string) {
    const num = parseBRL(raw)
    if (!isNaN(num) && num > 0) {
      atualizar(key, { precoBRL: num.toFixed(2).replace('.', ',') })
    }
  }

  const valorTotal = itens.reduce((acc, item) => {
    const preco = parseBRL(item.precoBRL)
    return acc + (isNaN(preco) ? 0 : preco * item.quantidade)
  }, 0)

  const valorBase = itens
    .filter(item => item.comissionavel)
    .reduce((acc, item) => {
      const preco = parseBRL(item.precoBRL)
      return acc + (isNaN(preco) ? 0 : preco * item.quantidade)
    }, 0)

  const comissaoEstimada = percentualComissao > 0 ? (valorBase * percentualComissao) / 100 : 0

  const itensValidos = itens.every(item => {
    const preco = parseBRL(item.precoBRL)
    return item.produtoNome.trim().length > 0 && !isNaN(preco) && preco > 0 && item.quantidade >= 1
  })

  async function handleConfirmar() {
    if (!itensValidos || salvando) return
    setSalvando(true)
    setErro(null)

    const resultado = await confirmarRecompra({
      aviso_id: aviso.id,
      venda_original_id: aviso.venda_id,
      loja_id,
      cliente_id: aviso.cliente_id,
      vendedora_id: aviso.vendedora_id,
      itens: itens.map(item => ({
        produto_id: item.produtoId || null,
        produto_nome: item.produtoNome.trim(),
        comissionavel: item.comissionavel,
        quantidade: item.quantidade,
        preco_unitario: parseBRL(item.precoBRL),
      })),
    })

    setSalvando(false)

    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }

    onSucesso(aviso.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onFechar}
      />

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold">Confirmar Recompra</h2>
            <p className="text-xs text-muted-foreground">{aviso.cliente_nome}</p>
          </div>
          <button
            onClick={onFechar}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Itens */}
          <div className="space-y-3">
            {itens.map((item, idx) => {
              const preco = parseBRL(item.precoBRL)
              const subtotal = !isNaN(preco) && preco > 0 ? preco * item.quantidade : null

              return (
                <div key={item.key} className="rounded-lg border border-input bg-muted/20 p-3 space-y-2.5">
                  {itens.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => setItens(prev => prev.filter(i => i.key !== item.key))}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <select
                    value={item.produtoId}
                    onChange={e => handleProdutoChange(item.key, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Selecione um produto…</option>
                    {catalogo.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Qtd</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={e => atualizar(item.key, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Preço unit. (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={item.precoBRL}
                        onChange={e => atualizar(item.key, { precoBRL: e.target.value })}
                        onBlur={() => handlePrecoBlur(item.key, item.precoBRL)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={item.comissionavel}
                        onClick={() => atualizar(item.key, { comissionavel: !item.comissionavel })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${item.comissionavel ? 'bg-primary' : 'bg-muted'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${item.comissionavel ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {item.comissionavel ? 'Comissionável' : 'Não comissionável'}
                      </span>
                    </div>
                    {subtotal !== null && (
                      <span className="text-sm font-medium">{formatarBRL(subtotal)}</span>
                    )}
                  </div>
                </div>
              )
            })}

            <button
              type="button"
              onClick={() => setItens(prev => [...prev, {
                key: crypto.randomUUID(),
                produtoId: '',
                produtoNome: '',
                quantidade: 1,
                precoBRL: '',
                comissionavel: true,
              }])}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar produto
            </button>
          </div>

          {/* Resumo financeiro */}
          {valorTotal > 0 && (
            <div className="rounded-md border bg-muted/30 divide-y">
              <div className="flex justify-between items-center px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total da recompra</span>
                <span className="font-semibold">{formatarBRL(valorTotal)}</span>
              </div>
              {valorBase < valorTotal && (
                <div className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Base comissionável</span>
                  <span className="font-medium">{formatarBRL(valorBase)}</span>
                </div>
              )}
              {percentualComissao > 0 && valorBase > 0 && (
                <div className="flex justify-between items-center px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Comissão ({percentualComissao}%)</span>
                  <span className="font-semibold text-green-600">{formatarBRL(comissaoEstimada)}</span>
                </div>
              )}
            </div>
          )}

          {erro && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{erro}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={!itensValidos || salvando}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
            >
              {salvando ? 'Confirmando…' : 'Confirmar Recompra'}
            </button>
            <button
              type="button"
              onClick={onFechar}
              disabled={salvando}
              className="rounded-md border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
