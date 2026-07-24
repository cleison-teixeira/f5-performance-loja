'use client'

import { useState } from 'react'
import { confirmarRecompra } from './actions'
import type { AvisoDetalhado } from './types'
import type { CatalogoProduto } from './page'
import type { VendedoraLoja } from './AvisosLista'
import { Plus, X } from 'lucide-react'
import { tocarCaixaRegistradora } from '@/lib/audio/caixaRegistradora'

interface Props {
  aviso: AvisoDetalhado
  catalogo: CatalogoProduto[]
  percentualComissao: number
  vendedorasLoja?: VendedoraLoja[]
  loja_id: string
  onSucesso: (aviso_id: string) => void
  onFechar: () => void
  itensPreenchidos?: Array<{ produto_id: string | null; produto_nome: string; preco_unitario?: number; ciclo_recompra_dias?: number | null }>
  item_venda_ids_grupo?: string[]
  isGrupo?: boolean
}

interface ItemForm {
  key: string
  produtoId: string
  produtoNome: string
  quantidade: number
  precoBRL: string
  comissionavel: boolean
  cicloRecompraDias: number | null
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
  vendedorasLoja,
  loja_id,
  onSucesso,
  onFechar,
  itensPreenchidos,
  item_venda_ids_grupo,
  isGrupo = false,
}: Props) {
  function criarItensIniciais(): ItemForm[] {
    if (itensPreenchidos && itensPreenchidos.length > 0) {
      return itensPreenchidos.map(item => {
        const prod = catalogo.find(p => p.id === item.produto_id)
        const preco = item.preco_unitario != null
          ? item.preco_unitario
          : (prod?.preco_sugerido ?? null)
        return {
          key: crypto.randomUUID(),
          produtoId: item.produto_id ?? '',
          produtoNome: item.produto_nome,
          quantidade: 1,
          precoBRL: preco != null ? preco.toFixed(2).replace('.', ',') : '',
          comissionavel: prod?.comissionavel_recompra ?? true,
          cicloRecompraDias: item.ciclo_recompra_dias ?? null,
        }
      })
    }
    const produtoInicial = catalogo.find(p => p.id === aviso.produto_id)
    return [{
      key: crypto.randomUUID(),
      produtoId: aviso.produto_id ?? '',
      produtoNome: aviso.produto_nome,
      quantidade: 1,
      precoBRL: produtoInicial?.preco_sugerido != null
        ? produtoInicial.preco_sugerido.toFixed(2).replace('.', ',')
        : '',
      comissionavel: produtoInicial?.comissionavel_recompra ?? true,
      cicloRecompraDias: null,
    }]
  }

  const [itens, setItens] = useState<ItemForm[]>(() => criarItensIniciais())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [vendedoraIdSelecionada, setVendedoraIdSelecionada] = useState(aviso.vendedora_id)

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
      vendedora_id: vendedoraIdSelecionada,
      itens: itens.map(item => ({
        produto_id: item.produtoId || null,
        produto_nome: item.produtoNome.trim(),
        comissionavel: item.comissionavel,
        quantidade: item.quantidade,
        preco_unitario: parseBRL(item.precoBRL),
        ciclo_recompra_dias: item.cicloRecompraDias ?? null,
      })),
      item_venda_ids_grupo,
    })

    setSalvando(false)

    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }

    tocarCaixaRegistradora()
    onSucesso(aviso.id)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onFechar}
      />

      {/* Modal */}
      <div className="relative z-[90] w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-xl shadow-xl max-h-[calc(100dvh-80px)] sm:max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-background border-b px-4 py-3 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl z-20">
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      {!isGrupo && (
                        <button
                          type="button"
                          onClick={() => setItens(prev => prev.filter(i => i.key !== item.key))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
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

                  {subtotal !== null && (
                    <div className="flex justify-end">
                      <span className="text-sm font-medium">{formatarBRL(subtotal)}</span>
                    </div>
                  )}
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
                cicloRecompraDias: null,
              }])}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Adicionar produto
            </button>
          </div>

          {/* Responsável pela recompra */}
          {vendedorasLoja && vendedorasLoja.length > 1 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Responsável pela recompra</label>
              <select
                value={vendedoraIdSelecionada}
                onChange={e => setVendedoraIdSelecionada(e.target.value)}
                className={inputClass}
              >
                {vendedorasLoja.map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
          )}

          {/* Resumo financeiro */}
          {valorTotal > 0 && (
            <div className="rounded-md border bg-muted/30 divide-y">
              <div className="flex justify-between items-center px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total da recompra</span>
                <span className="font-semibold">{formatarBRL(valorTotal)}</span>
              </div>
            </div>
          )}

          {erro && (
            <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{erro}</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-background border-t px-4 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-4 flex gap-2 z-20">
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
  )
}
