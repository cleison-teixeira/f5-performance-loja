'use client'

import { useState, useEffect, useTransition } from 'react'
import { buscarCliente, salvarVenda } from './actions'
import { ResumoVenda } from './ResumoVenda'
import { ProdutoSearchInput, type ProdutoSelecionadoResult } from './ProdutoSearchInput'
import { normalizarWhatsapp, formatarWhatsapp } from '@/lib/whatsapp/mask'
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
  ciclo_padrao?: number | null
  qtd_mensagens?: number | null
}

interface Props {
  loja_id: string
  loja_nome: string
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
  ciclo_recompra_dias: number
  qtd_mensagens: number
  modelo_fluxo?: string
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
  avisos: Array<{ data_aviso: string; texto_renderizado: string; tipo: string }>
}

function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
}

function novoItem(): ItemFormState {
  return { key: crypto.randomUUID(), produtoId: '', produtoNome: '', quantidade: 1, precoBRL: '', recorrente: true, comissionavel: true, ciclo_recompra_dias: 30, qtd_mensagens: 3, modelo_fluxo: 'modelo_3_agrad_rel_rec' }
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function FormNovaVenda({
  loja_id,
  loja_nome,
  vendedora_logada_id,
  vendedora_logada_nome,
  vendedoras,
  produtos,
  fixasPorVendedoraProduto,
}: Props) {
  const [etapa, setEtapa] = useState<'form' | 'resumo'>('form')
  const [resumo, setResumo] = useState<ResumoData | null>(null)

  const [vendedoraId, setVendedoraId] = useState<string>(vendedora_logada_id)

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

  function obterDefaultModeloFluxo(qtd: number): string {
    if (qtd === 1 || qtd === 2) return 'modelo_2_agrad_rec'
    if (qtd === 3) return 'modelo_3_agrad_rel_rec'
    if (qtd === 4) return 'modelo_4_completo'
    if (qtd === 5) return 'modelo_5_follow_up'
    return 'modelo_3_agrad_rel_rec'
  }

  function handleProdutoSelect(key: string, resultado: ProdutoSelecionadoResult) {
    setItens(prev => prev.map(item => {
      if (item.key !== key) return item
      if (!resultado.nome.trim()) {
        return { ...item, produtoId: '', produtoNome: '', precoBRL: '' }
      }
      if (resultado.id) {
        const defaultQtd = resultado.qtd_mensagens ?? 3
        return {
          ...item,
          produtoId: resultado.id,
          produtoNome: resultado.nome,
          precoBRL: resultado.preco_sugerido != null
            ? resultado.preco_sugerido.toFixed(2).replace('.', ',')
            : item.precoBRL,
          recorrente: resultado.recorrente ?? item.recorrente,
          comissionavel: resultado.comissionavel_recompra ?? item.comissionavel,
          ciclo_recompra_dias: resultado.ciclo_padrao ?? item.ciclo_recompra_dias,
          qtd_mensagens: defaultQtd,
          modelo_fluxo: obterDefaultModeloFluxo(defaultQtd),
        }
      }
      return { ...item, produtoId: '', produtoNome: resultado.nome }
    }))
  }

  function handlePrecoBlur(key: string, raw: string) {
    const num = parseBRL(raw)
    if (!isNaN(num) && num > 0) {
      atualizarItem(key, { precoBRL: num.toFixed(2).replace('.', ',') })
    }
  }

  const todasVendedoras = vendedoras.some(v => v.id === vendedora_logada_id)
    ? vendedoras
    : [{ id: vendedora_logada_id, nome: vendedora_logada_nome, percentual_comissao: 0 }, ...vendedoras]

  const vendedoraSelecionada = todasVendedoras.find(v => v.id === vendedoraId)
    ?? { id: vendedora_logada_id, nome: vendedora_logada_nome, percentual_comissao: 0 }

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
    const produtoFixo = item.produtoId ? fixasVendedora[item.produtoId] : undefined
    if (produtoFixo != null) {
      previsaoFixa += produtoFixo
    } else {
      previsaoBaseSemFixo += preco * item.quantidade
    }
  }
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

    const vendedoraNome = vendedoraSelecionada?.nome ?? vendedora_logada_nome

    const resultado = await salvarVenda({
      loja_id,
      cliente_nome: clienteNome.trim(),
      cliente_whatsapp: digits,
      data_compra: dataCompra,
      itens: itens.map(item => ({
        produto_id: item.produtoId === '' ? null : item.produtoId,
        produto_nome: item.produtoNome.trim(),
        recorrente: item.recorrente,
        comissionavel_recompra: item.comissionavel,
        quantidade: item.quantidade,
        preco_unitario: parseBRL(item.precoBRL),
        ciclo_recompra_dias: item.recorrente ? item.ciclo_recompra_dias : null,
        modelo_fluxo: item.recorrente ? item.modelo_fluxo : null,
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
    setVendedoraId(vendedora_logada_id)
  }

  if (etapa === 'resumo' && resumo) {
    return (
      <ResumoVenda
        cliente_nome={resumo.cliente_nome}
        data_compra={resumo.data_compra}
        itens={resumo.itens}
        valor_total={resumo.valor_total}
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

              <ProdutoSearchInput
                produtos={produtos}
                nome={item.produtoNome}
                produtoId={item.produtoId}
                onSelect={resultado => handleProdutoSelect(item.key, resultado)}
                inputClass={inputClass}
              />

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

              {item.recorrente && (
                <div className="space-y-3 border-t pt-2.5 mt-1.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium block">Ciclo desta compra (dias)</label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[30, 45, 60, 90].map(dias => (
                        <button
                          key={dias}
                          type="button"
                          onClick={() => atualizarItem(item.key, { ciclo_recompra_dias: dias })}
                          className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                            item.ciclo_recompra_dias === dias
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background hover:bg-accent'
                          }`}
                        >
                          {dias} dias
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        value={item.ciclo_recompra_dias || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value, 10)
                          atualizarItem(item.key, { ciclo_recompra_dias: isNaN(val) ? 1 : val })
                        }}
                        className="w-16 px-2 py-1 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Outro"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium block">Modelo de contato desta compra</label>
                    <select
                      value={item.modelo_fluxo || 'modelo_3_agrad_rel_rec'}
                      onChange={e => atualizarItem(item.key, { modelo_fluxo: e.target.value })}
                      className="w-full text-xs rounded border border-input p-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="modelo_2_agrad_rec">Agradecimento + Recompra</option>
                      <option value="modelo_3_agrad_rec_oferta">Agradecimento + Recompra + Oferta</option>
                      <option value="modelo_3_agrad_rel_rec">Agradecimento + Relacionamento + Recompra</option>
                      <option value="modelo_4_completo">Agradecimento + Relacionamento + Recompra + Oferta</option>
                      <option value="modelo_5_follow_up">Agradecimento + Relacionamento + Recompra + Oferta + Confirmação</option>
                    </select>
                  </div>

                  {item.ciclo_recompra_dias > 0 && (
                    <div className="rounded bg-muted/40 p-2.5 text-xs space-y-1.5 mt-1 border border-input/30">
                      <p className="font-semibold text-muted-foreground">Sequência que será criada:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {(() => {
                          const cic = item.ciclo_recompra_dias
                          const mod = item.modelo_fluxo || 'modelo_3_agrad_rel_rec'
                          const rel = Math.max(0, Math.floor(cic / 2))
                          const rec = Math.max(rel, cic - 5)
                          const of = Math.max(rec, cic - 1)
                          const fw = Math.max(of + 1, cic + 2)

                          const renderSteps = []
                          if (mod === 'modelo_2_agrad_rec') {
                            renderSteps.push(<li>Agradecimento: hoje (D0)</li>)
                            renderSteps.push(<li>Recompra: em {rec} dias</li>)
                          } else if (mod === 'modelo_3_agrad_rec_oferta') {
                            renderSteps.push(<li>Agradecimento: hoje (D0)</li>)
                            renderSteps.push(<li>Recompra: em {rec} dias</li>)
                            renderSteps.push(<li>Oferta: em {of} dias</li>)
                          } else if (mod === 'modelo_3_agrad_rel_rec') {
                            renderSteps.push(<li>Agradecimento: hoje (D0)</li>)
                            renderSteps.push(<li>Relacionamento: em {rel} dias</li>)
                            renderSteps.push(<li>Recompra: em {rec} dias</li>)
                          } else if (mod === 'modelo_4_completo') {
                            renderSteps.push(<li>Agradecimento: hoje (D0)</li>)
                            renderSteps.push(<li>Relacionamento: em {rel} dias</li>)
                            renderSteps.push(<li>Recompra: em {rec} dias</li>)
                            renderSteps.push(<li>Oferta: em {of} dias</li>)
                          } else if (mod === 'modelo_5_follow_up') {
                            renderSteps.push(<li>Agradecimento: hoje (D0)</li>)
                            renderSteps.push(<li>Relacionamento: em {rel} dias</li>)
                            renderSteps.push(<li>Recompra: em {rec} dias</li>)
                            renderSteps.push(<li>Oferta: em {of} dias</li>)
                            renderSteps.push(<li>Confirmação: em {fw} dias</li>)
                          }
                          return renderSteps
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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
          </div>
        )}
      </div>

      {/* Bloco: Responsável */}
      <div className="rounded-xl border bg-card p-4 space-y-1.5">
        <label className="block text-sm font-medium" htmlFor="vendedora">
          Responsável pela venda
        </label>
        <select
          id="vendedora"
          value={vendedoraId}
          onChange={e => setVendedoraId(e.target.value)}
          className={inputClass}
        >
          {todasVendedoras.map(v => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>
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
