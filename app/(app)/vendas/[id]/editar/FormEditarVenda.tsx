'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, CheckCircle2, Loader2 } from 'lucide-react'
import { editarVenda, type ItemEditarInput } from './actions'
import type { ItemEditarInicial } from './page'

interface Catalogo {
  id: string
  nome: string
  preco_sugerido: number | null
  comissionavel_recompra: boolean
}

interface Props {
  venda_id: string
  loja_id: string
  loja_nome: string
  data_compra: string
  vendedora_atual_id: string
  vendedora_atual_nome: string
  isVendedora: boolean
  itens_iniciais: ItemEditarInicial[]
  catalogo: Catalogo[]
  vendedoras: { id: string; nome: string }[]
}

interface ItemFormState {
  key: string
  item_venda_id: string | null
  produto_id: string | null
  produto_nome: string
  quantidade: number
  precoBRL: string
  recorrente: boolean
  comissionavel: boolean
}

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
}

function toBRL(v: number): string {
  return v.toFixed(2).replace('.', ',')
}

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hojeLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function FormEditarVenda({
  venda_id, loja_id: _loja_id, loja_nome: _loja_nome,
  data_compra: data_compra_inicial,
  vendedora_atual_id, vendedora_atual_nome,
  isVendedora, itens_iniciais, catalogo, vendedoras,
}: Props) {
  const router = useRouter()

  const [dataCompra, setDataCompra] = useState(data_compra_inicial)
  const [vendedoraId, setVendedoraId] = useState(vendedora_atual_id)

  const [itens, setItens] = useState<ItemFormState[]>(
    itens_iniciais.map(i => ({
      key: i.item_venda_id,
      item_venda_id: i.item_venda_id,
      produto_id: i.produto_id,
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      precoBRL: toBRL(i.preco_unitario),
      recorrente: i.recorrente,
      comissionavel: i.comissionavel,
    }))
  )

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<{ avisos_recalculados: number; avisos_criados: number; avisos_removidos: number } | null>(null)

  function atualizarItem(key: string, patch: Partial<ItemFormState>) {
    setItens(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  }

  function removerItem(key: string) {
    setItens(prev => prev.filter(i => i.key !== key))
  }

  function adicionarItem() {
    setItens(prev => [...prev, {
      key: crypto.randomUUID(),
      item_venda_id: null,
      produto_id: '',
      produto_nome: '',
      quantidade: 1,
      precoBRL: '',
      recorrente: true,
      comissionavel: true,
    }])
  }

  function handleNovoProdutoChange(key: string, produtoId: string) {
    const prod = catalogo.find(p => p.id === produtoId)
    if (prod) {
      atualizarItem(key, {
        produto_id: prod.id,
        produto_nome: prod.nome,
        precoBRL: prod.preco_sugerido != null ? toBRL(prod.preco_sugerido) : '',
        recorrente: true,
        comissionavel: prod.comissionavel_recompra,
      })
    } else {
      atualizarItem(key, { produto_id: '', produto_nome: '', precoBRL: '', recorrente: true })
    }
  }

  function handlePrecoBlur(key: string, raw: string) {
    const num = parseBRL(raw)
    if (!isNaN(num) && num > 0) {
      atualizarItem(key, { precoBRL: toBRL(num) })
    }
  }

  const valorTotal = itens.reduce((acc, item) => {
    const preco = parseBRL(item.precoBRL)
    return acc + (isNaN(preco) ? 0 : preco * item.quantidade)
  }, 0)

  const itensValidos = itens.length > 0 && itens.every(item => {
    const preco = parseBRL(item.precoBRL)
    return item.produto_nome.trim().length > 0 && !isNaN(preco) && preco > 0 && item.quantidade >= 1
  })

  const podeSalvar = itensValidos && !salvando

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar) return

    setSalvando(true)
    setErro(null)
    setSucesso(null)

    const vendedoraNome = isVendedora
      ? vendedora_atual_nome
      : (vendedoras.find(v => v.id === vendedoraId)?.nome ?? vendedora_atual_nome)

    const itensPayload: ItemEditarInput[] = itens.map(item => ({
      item_venda_id: item.item_venda_id,
      produto_id: item.produto_id || null,
      produto_nome: item.produto_nome.trim(),
      quantidade: item.quantidade,
      preco_unitario: parseBRL(item.precoBRL),
      recorrente: item.recorrente,
      comissionavel: item.comissionavel,
    }))

    const resultado = await editarVenda({
      venda_id,
      data_compra: dataCompra,
      vendedora_id: isVendedora ? vendedora_atual_id : vendedoraId,
      vendedora_nome: vendedoraNome,
      loja_nome: _loja_nome,
      itens: itensPayload,
    })

    setSalvando(false)

    if (!resultado.ok) {
      setErro(resultado.erro ?? 'Erro ao salvar')
      return
    }

    setSucesso({
      avisos_recalculados: resultado.avisos_recalculados,
      avisos_criados: resultado.avisos_criados,
      avisos_removidos: resultado.avisos_removidos,
    })
    router.refresh()
  }

  if (sucesso) {
    const total = sucesso.avisos_recalculados + sucesso.avisos_criados + sucesso.avisos_removidos
    return (
      <div className="rounded-xl border bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/30 p-6 space-y-3 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <div>
          <p className="text-base font-semibold text-emerald-800 dark:text-emerald-200">Compra atualizada</p>
          {total > 0 && (
            <p className="text-sm text-emerald-700/80 dark:text-emerald-300/70 mt-1">
              {sucesso.avisos_recalculados > 0 && `${sucesso.avisos_recalculados} aviso${sucesso.avisos_recalculados !== 1 ? 's' : ''} recalculado${sucesso.avisos_recalculados !== 1 ? 's' : ''}. `}
              {sucesso.avisos_criados > 0 && `${sucesso.avisos_criados} aviso${sucesso.avisos_criados !== 1 ? 's' : ''} criado${sucesso.avisos_criados !== 1 ? 's' : ''}. `}
              {sucesso.avisos_removidos > 0 && `${sucesso.avisos_removidos} aviso${sucesso.avisos_removidos !== 1 ? 's' : ''} cancelado${sucesso.avisos_removidos !== 1 ? 's' : ''}.`}
            </p>
          )}
        </div>
        <div className="flex justify-center gap-3 pt-1">
          <button
            onClick={() => router.push('/vendas')}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Ver Extrato
          </button>
          <button
            onClick={() => { setSucesso(null); router.refresh() }}
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Continuar editando
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Data da compra */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data da compra</p>
        <input
          type="date"
          value={dataCompra}
          max={hojeLocal()}
          onChange={e => setDataCompra(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Produtos */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {itens.length === 1 ? 'Produto' : 'Produtos'}
        </p>

        {itens.map((item, idx) => {
          const precoNum = parseBRL(item.precoBRL)
          const subtotal = !isNaN(precoNum) && precoNum > 0 ? precoNum * item.quantidade : null
          const isExistente = item.item_venda_id !== null

          return (
            <div key={item.key} className="rounded-lg border border-input bg-muted/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {isExistente ? `Produto ${idx + 1}` : `Novo produto ${idx + 1}`}
                </span>
                {itens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerItem(item.key)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover produto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Existente: nome como label */}
              {isExistente ? (
                <p className="text-sm font-medium text-foreground">{item.produto_nome}</p>
              ) : (
                /* Novo: select do catálogo */
                <select
                  value={item.produto_id ?? ''}
                  onChange={e => handleNovoProdutoChange(item.key, e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Selecione um produto…</option>
                  {catalogo.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Qtd</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={e => atualizarItem(item.key, { quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
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
                    onChange={e => atualizarItem(item.key, { precoBRL: e.target.value })}
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
                    aria-checked={item.recorrente}
                    onClick={() => atualizarItem(item.key, { recorrente: !item.recorrente })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${item.recorrente ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${item.recorrente ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {item.recorrente ? 'Recorrente' : 'Não recorrente'}
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
          onClick={adicionarItem}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar produto
        </button>

        {valorTotal > 0 && (
          <div className="rounded-md bg-muted/60 px-4 py-2.5">
            <div className="text-sm flex justify-between items-center">
              <span className="text-muted-foreground">Total da compra</span>
              <span className="font-semibold">{formatarBRL(valorTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Vendedora */}
      <div className="rounded-xl border bg-card p-4 space-y-1.5">
        <label className="block text-sm font-medium">Vendedora responsável</label>
        {isVendedora ? (
          <input
            type="text"
            value={vendedora_atual_nome}
            disabled
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
          />
        ) : (
          <select
            value={vendedoraId}
            onChange={e => setVendedoraId(e.target.value)}
            className={inputClass}
          >
            {vendedoras.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        )}
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!podeSalvar}
          className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {salvando ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : (
            'Salvar alterações'
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push('/vendas')}
          disabled={salvando}
          className="rounded-xl border border-input bg-background px-4 py-3 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>

    </form>
  )
}
