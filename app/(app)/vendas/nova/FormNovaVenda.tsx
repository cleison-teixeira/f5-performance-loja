'use client'

import { useState, useEffect, useTransition } from 'react'
import { buscarCliente, salvarVenda } from './actions'
import { ResumoVenda } from './ResumoVenda'
import { normalizarWhatsapp, formatarWhatsapp } from '@/lib/whatsapp/mask'
import { calcularComissao } from '@/lib/comissoes/calculador'
import { CheckCircle, Loader2, UserPlus, Plus, X } from 'lucide-react'

interface Vendedora {
  id: string
  nome: string
  percentual_comissao: number
}

interface ProdutoCatalogo {
  id: string
  nome: string
  preco_sugerido: number | null
  foto_url?: string | null
  recorrente: boolean
  comissionavel_recompra: boolean
}

interface Props {
  loja_id: string
  loja_nome: string
  userRole: string
  vendedora_logada_id: string
  vendedora_logada_nome: string
  vendedoras: Vendedora[]
  produtos: ProdutoCatalogo[]
  fixasPorVendedoraProduto: Record<string, Record<string, number>>
}

interface ItemFormState {
  key: string
  produtoId: string
  produtoNome: string
  quantidade: number
  precoBRL: string
  recorrente: boolean
  comissionavel: boolean
}

type ResumoData = {
  venda_id: string
  cliente_nome: string
  data_compra: string
  itens: Array<{
    produto_nome: string
    quantidade: number
    preco_unitario: number
    recorrente: boolean
    comissionavel_recompra: boolean
  }>
  valor_total: number
  previsao_comissao: number
  percentual_comissao: number
  avisos: Array<{ data_aviso: string; texto_renderizado: string; tipo: string }>
}

function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
}

function novoItem(): ItemFormState {
  return { key: crypto.randomUUID(), produtoId: '', produtoNome: '', quantidade: 1, precoBRL: '', recorrente: true, comissionavel: true }
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function FormNovaVenda({
  loja_id,
  loja_nome,
  userRole,
  vendedora_logada_id,
  vendedora_logada_nome,
  vendedoras,
  produtos,
  fixasPorVendedoraProduto,
}: Props) {
  const [etapa, setEtapa] = useState<'form' | 'resumo'>('form')
  const [resumo, setResumo] = useState<ResumoData | null>(null)

  const isVendedora = userRole === 'vendedora'

  const [vendedoraId, setVendedoraId] = useState<string>(
    isVendedora ? vendedora_logada_id : (vendedoras[0]?.id ?? vendedora_logada_id)
  )

  function hojeLocal() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const [whatsapp, setWhatsapp] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState<{ id: string; nome: string } | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [dataCompra, setDataCompra] = useState(hojeLocal)
  const [buscandoCliente, startBuscaTransition] = useTransition()

  const [itens, setItens] = useState<ItemFormState[]>([novoItem()])

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const digits = normalizarWhatsapp(whatsapp)
    if (digits.length >= 10) {
      startBuscaTransition(async () => {
        const encontrado = await buscarCliente(digits, loja_id)
        if (encontrado) {
          setClienteEncontrado(encontrado)
          setClienteNome(encontrado.nome)
        } else {
          setClienteEncontrado(null)
          setClienteNome('')
        }
      })
    } else {
      setClienteEncontrado(null)
      setClienteNome('')
    }
  }, [whatsapp, loja_id])

  function atualizarItem(key: string, patch: Partial<ItemFormState>) {
    setItens(prev => prev.map(item => item.key === key ? { ...item, ...patch } : item))
  }

  function handleProdutoChange(key: string, value: string) {
    if (value === '' || value === '__novo__') {
      // __novo__ → recorrente: false por padrão (granel/item livre é pontual)
      // Vendedora pode ligar o toggle se for um produto real de recompra
      atualizarItem(key, { produtoId: value, produtoNome: '', precoBRL: '', recorrente: false, comissionavel: true })
      return
    }
    const prod = produtos.find(p => p.id === value)
    if (prod) {
      atualizarItem(key, {
        produtoId: value,
        produtoNome: prod.nome,
        precoBRL: prod.preco_sugerido != null ? prod.preco_sugerido.toFixed(2).replace('.', ',') : '',
        recorrente: prod.recorrente,
        comissionavel: prod.comissionavel_recompra,
      })
    }
  }

  function handlePrecoBlur(key: string, raw: string) {
    const num = parseBRL(raw)
    if (!isNaN(num) && num > 0) {
      atualizarItem(key, { precoBRL: num.toFixed(2).replace('.', ',') })
    }
  }

  const vendedoraSelecionada = isVendedora
    ? { id: vendedora_logada_id, nome: vendedora_logada_nome, percentual_comissao: vendedoras.find(v => v.id === vendedora_logada_id)?.percentual_comissao ?? 0 }
    : vendedoras.find(v => v.id === vendedoraId)

  const percentualComissao = vendedoraSelecionada?.percentual_comissao ?? 0

  const valorTotal = itens.reduce((acc, item) => {
    const preco = parseBRL(item.precoBRL)
    return acc + (isNaN(preco) ? 0 : preco * item.quantidade)
  }, 0)

  // Previsão de comissão com lógica de prioridade (produto fixo > percentual padrão)
  const fixasVendedora = fixasPorVendedoraProduto[vendedoraId] ?? {}
  let previsaoFixa = 0
  let previsaoBaseSemFixo = 0
  for (const item of itens) {
    if (!item.recorrente || !item.comissionavel) continue
    const preco = parseBRL(item.precoBRL)
    if (isNaN(preco) || preco <= 0) continue
    const produtoFixo = item.produtoId && item.produtoId !== '__novo__' ? fixasVendedora[item.produtoId] : undefined
    if (produtoFixo != null) {
      previsaoFixa += produtoFixo
    } else {
      previsaoBaseSemFixo += preco * item.quantidade
    }
  }
  const previsaoComissao = previsaoFixa + calcularComissao(previsaoBaseSemFixo, percentualComissao)
  const apenasFixo = previsaoFixa > 0 && previsaoBaseSemFixo === 0
  const temFixo = previsaoFixa > 0

  const digits = normalizarWhatsapp(whatsapp)
  const itensValidos = itens.every(item => {
    const preco = parseBRL(item.precoBRL)
    return item.produtoNome.trim().length > 0 && !isNaN(preco) && preco > 0 && item.quantidade >= 1
  })
  const podeSalvar =
    digits.length >= 10 &&
    clienteNome.trim().length > 0 &&
    itens.length > 0 &&
    itensValidos &&
    !carregando &&
    !buscandoCliente

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!podeSalvar) return

    setCarregando(true)
    setErro('')

    const vendedoraNome = isVendedora
      ? vendedora_logada_nome
      : (vendedoraSelecionada?.nome ?? vendedora_logada_nome)

    const resultado = await salvarVenda({
      loja_id,
      cliente_nome: clienteNome.trim(),
      cliente_whatsapp: digits,
      data_compra: dataCompra,
      itens: itens.map(item => ({
        produto_id: item.produtoId === '' || item.produtoId === '__novo__' ? null : item.produtoId,
        produto_nome: item.produtoNome.trim(),
        recorrente: item.recorrente,
        comissionavel_recompra: item.comissionavel,
        quantidade: item.quantidade,
        preco_unitario: parseBRL(item.precoBRL),
      })),
      vendedora_id: vendedoraId,
      vendedora_nome: vendedoraNome,
      loja_nome,
    })

    setCarregando(false)

    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }

    setResumo({
      venda_id: resultado.venda_id,
      cliente_nome: resultado.cliente_nome,
      data_compra: dataCompra,
      itens: resultado.itens,
      valor_total: resultado.valor_total,
      previsao_comissao: resultado.previsao_comissao,
      percentual_comissao: resultado.percentual_comissao,
      avisos: resultado.avisos,
    })
    setEtapa('resumo')
  }

  function handleNovaVenda() {
    setEtapa('form')
    setResumo(null)
    setWhatsapp('')
    setClienteEncontrado(null)
    setClienteNome('')
    setDataCompra(hojeLocal())
    setItens([novoItem()])
    setErro('')
    if (!isVendedora) setVendedoraId(vendedoras[0]?.id ?? vendedora_logada_id)
  }

  if (etapa === 'resumo' && resumo) {
    return (
      <ResumoVenda
        cliente_nome={resumo.cliente_nome}
        data_compra={resumo.data_compra}
        itens={resumo.itens}
        valor_total={resumo.valor_total}
        previsao_comissao={resumo.previsao_comissao}
        percentual_comissao={resumo.percentual_comissao}
        avisos={resumo.avisos}
        onNovaVenda={handleNovaVenda}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Bloco: Cliente */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</p>

        {/* WhatsApp + Nome — lado a lado no desktop */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="whatsapp">
              WhatsApp
            </label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              autoFocus
              placeholder="(XX) XXXXX-XXXX"
              value={whatsapp}
              onChange={e => {
                const d = normalizarWhatsapp(e.target.value)
                setWhatsapp(formatarWhatsapp(d))
              }}
              className={inputClass}
            />
            {buscandoCliente && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando cliente…
              </p>
            )}
            {!buscandoCliente && digits.length >= 10 && clienteEncontrado && (
              <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="h-3 w-3" />
                Cliente encontrado: <strong>{clienteEncontrado.nome}</strong>
              </p>
            )}
            {!buscandoCliente && digits.length >= 10 && !clienteEncontrado && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserPlus className="h-3 w-3" />
                Cliente novo — preencha o nome abaixo
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="clienteNome">
              Nome
            </label>
            <input
              id="clienteNome"
              type="text"
              placeholder="Nome completo"
              value={clienteNome}
              onChange={e => setClienteNome(e.target.value)}
              disabled={!!clienteEncontrado}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium" htmlFor="dataCompra">
            Data da compra
          </label>
          <input
            id="dataCompra"
            type="date"
            value={dataCompra}
            max={hojeLocal()}
            onChange={e => setDataCompra(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Bloco: Produtos */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {itens.length === 1 ? 'Produto' : 'Produtos'}
        </p>

        {itens.map((item, idx) => {
          const precoNum = parseBRL(item.precoBRL)
          const subtotal = !isNaN(precoNum) && precoNum > 0 ? precoNum * item.quantidade : null

          return (
            <div key={item.key} className="rounded-lg border border-input bg-muted/20 p-3 space-y-2.5">
              {itens.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Produto {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setItens(prev => prev.filter(i => i.key !== item.key))}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover produto"
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
                <option value="__novo__">＋ Novo produto…</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>

              {item.produtoId === '__novo__' && (
                <input
                  type="text"
                  placeholder="Nome do produto"
                  value={item.produtoNome}
                  onChange={e => atualizarItem(item.key, { produtoNome: e.target.value })}
                  className={inputClass}
                />
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
          onClick={() => setItens(prev => [...prev, novoItem()])}
          className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar produto
        </button>

        <p className="text-xs text-muted-foreground">
          Para granel ou item pontual, use um produto novo com valor final aberto.
        </p>

        {valorTotal > 0 && (
          <div className="rounded-md bg-muted/60 px-4 py-2.5 space-y-1">
            <div className="text-sm flex justify-between items-center">
              <span className="text-muted-foreground">Total da venda</span>
              <span className="font-semibold">{formatarBRL(valorTotal)}</span>
            </div>
            {previsaoBaseSemFixo > 0 && (previsaoBaseSemFixo + previsaoFixa) < valorTotal && (
              <div className="text-sm flex justify-between items-center">
                <span className="text-muted-foreground">Base prevista de recompra</span>
                <span className="font-medium">{formatarBRL(previsaoBaseSemFixo + previsaoFixa)}</span>
              </div>
            )}
            {previsaoComissao > 0 && (
              <div className="text-sm flex justify-between items-center">
                <span className="text-muted-foreground">
                  {apenasFixo
                    ? 'Previsão de comissão (fixo)'
                    : temFixo
                      ? 'Previsão de comissão (fixo + %)'
                      : `Previsão de comissão (${percentualComissao}%)`}
                </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">{formatarBRL(previsaoComissao)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bloco: Responsável */}
      <div className="rounded-xl border bg-card p-4 space-y-1.5">
        <label className="block text-sm font-medium" htmlFor="vendedora">
          Vendedora responsável
        </label>
        {isVendedora ? (
          <input
            id="vendedora"
            type="text"
            value={vendedora_logada_nome}
            disabled
            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
          />
        ) : (
          <select
            id="vendedora"
            value={vendedoraId}
            onChange={e => setVendedoraId(e.target.value)}
            className={inputClass}
          >
            {vendedoras.length === 0 && (
              <option value={vendedora_logada_id}>{vendedora_logada_nome}</option>
            )}
            {vendedoras.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        )}
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={!podeSalvar}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {carregando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Registrando…
          </>
        ) : (
          'Registrar Venda'
        )}
      </button>
    </form>
  )
}
