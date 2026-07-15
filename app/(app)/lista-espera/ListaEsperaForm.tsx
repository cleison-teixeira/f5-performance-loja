'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, CheckCircle } from 'lucide-react'
import { criarListaEsperaMultiplos, buscarClienteListaEspera } from './actions'
import { tocarCaixaRegistradora } from '@/lib/audio/caixaRegistradora'

function hojeLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

import { formatarWhatsapp, normalizarWhatsapp } from '@/lib/whatsapp/mask'
import { normalizarNome } from '@/lib/normalizar-nome'
import { normalizarNomePessoa, normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'

interface Categoria {
  id: string
  nome: string
}

interface Vendedora {
  id: string
  nome: string
}

interface Produto {
  id: string
  nome: string
}

interface ItemForm {
  key: string
  produto_nome: string
  categoria_id: string
  valor_potencial: string
  quantidade: string
  produtoExiste: boolean | null
  sugestaoCatalogo: Produto | null
  recorrente: boolean
}

interface Props {
  loja_id: string
  isVendedora: boolean
  defaultVendedoraId: string
  vendedoras: Vendedora[]
  categorias: Categoria[]
  produtos: Produto[]
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function formatarValorBRL(raw: string): string {
  if (!raw.trim()) return raw
  const num = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  if (isNaN(num)) return raw
  return num.toFixed(2).replace('.', ',')
}

function encontrarSimilarCatalogo(query: string, produtos: Produto[]): Produto | null {
  const normQ = normalizarNome(query)
  if (normQ.length < 3) return null
  const tokensQ = normQ.split(' ').filter(t => t.length > 2)
  if (tokensQ.length === 0) return null

  for (const p of produtos) {
    const normP = normalizarNome(p.nome)
    if (normP === normQ) return null
    const tokensP = normP.split(' ')
    const overlap = tokensQ.filter(t =>
      tokensP.some(tp => tp === t || tp.startsWith(t) || t.startsWith(tp))
    ).length
    if (overlap >= Math.max(1, Math.ceil(tokensQ.length * 0.6))) return p
  }
  return null
}

function novoItem(): ItemForm {
  return {
    key: crypto.randomUUID(),
    produto_nome: '',
    categoria_id: '',
    valor_potencial: '',
    quantidade: '1',
    produtoExiste: null,
    sugestaoCatalogo: null,
    recorrente: true,
  }
}

export function ListaEsperaForm({
  loja_id,
  isVendedora,
  defaultVendedoraId,
  vendedoras,
  categorias,
  produtos,
}: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isBuscando, startBuscaTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const estadoInicial = {
    cliente_nome: '',
    cliente_whatsapp: '',
    observacao: '',
    vendedora_id: defaultVendedoraId,
    data_registro: hojeLocal(),
  }

  const [form, setForm] = useState(estadoInicial)
  const [itens, setItens] = useState<ItemForm[]>([novoItem()])

  useEffect(() => {
    if (!aberto) return
    const digits = normalizarWhatsapp(form.cliente_whatsapp)
    if (digits.length < 10) return
    startBuscaTransition(async () => {
      const cliente = await buscarClienteListaEspera(digits, loja_id)
      if (cliente) {
        setForm(f => ({ ...f, cliente_nome: normalizarNomePessoa(cliente.nome) }))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cliente_whatsapp])

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function updateItem(key: string, patch: Partial<ItemForm>) {
    setItens(prev => prev.map(item => item.key === key ? { ...item, ...patch } : item))
  }

  function handleProdutoChange(key: string, valor: string) {
    const norm = normalizarNome(valor)
    if (norm.length < 2) {
      updateItem(key, { produto_nome: valor, produtoExiste: null, sugestaoCatalogo: null })
      return
    }
    const exactMatch = produtos.find(p => normalizarNome(p.nome) === norm)
    if (exactMatch) {
      updateItem(key, { produto_nome: valor, produtoExiste: true, sugestaoCatalogo: null })
      return
    }
    updateItem(key, {
      produto_nome: valor,
      produtoExiste: false,
      sugestaoCatalogo: encontrarSimilarCatalogo(valor, produtos),
    })
  }

  function usarSugestao(key: string, p: Produto) {
    updateItem(key, { produto_nome: p.nome, produtoExiste: true, sugestaoCatalogo: null })
  }

  function removerItem(key: string) {
    setItens(prev => prev.length > 1 ? prev.filter(item => item.key !== key) : prev)
  }

  function fechar() {
    setForm(estadoInicial)
    setErro(null)
    setSucesso(false)
    setItens([novoItem()])
    setAberto(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!form.cliente_nome.trim()) {
      setErro('Preencha o nome do cliente.')
      return
    }
    const whatsappDigits = normalizarWhatsapp(form.cliente_whatsapp)
    if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      setErro('WhatsApp inválido. Use o formato (XX) XXXXX-XXXX.')
      return
    }
    if (itens.some(item => !item.produto_nome.trim())) {
      setErro('Preencha o nome de todos os produtos antes de salvar.')
      return
    }

    startTransition(async () => {
      const res = await criarListaEsperaMultiplos({
        loja_id,
        cliente_nome: form.cliente_nome,
        cliente_whatsapp: whatsappDigits,
        vendedora_id: form.vendedora_id,
        data_registro: form.data_registro || hojeLocal(),
        observacao: form.observacao || undefined,
        itens: itens.map(item => {
          const v = item.valor_potencial
            ? parseFloat(item.valor_potencial.replace(/\./g, '').replace(',', '.'))
            : NaN
          return {
            produto_nome: item.produto_nome,
            categoria_id: item.categoria_id || undefined,
            valor_potencial: isNaN(v) ? null : v,
            quantidade: Math.max(1, parseInt(item.quantidade) || 1),
            recorrente: item.recorrente,
          }
        }),
      })
      if (res.ok) {
        tocarCaixaRegistradora()
        setSucesso(true)
        router.refresh()
        setTimeout(fechar, 1500)
      } else {
        setErro(res.error ?? 'Erro ao salvar.')
      }
    })
  }

  if (sucesso) {
    return (
      <div className="rounded-xl border bg-card p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">
          {itens.length > 1 ? `${itens.length} oportunidades salvas!` : 'Oportunidade salva!'}
        </span>
      </div>
    )
  }

  if (!aberto) {
    return (
      <div className="space-y-1.5">
        <button
          onClick={() => setAberto(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors w-full"
        >
          <Plus className="h-4 w-4" />
          Novo pedido na lista
        </button>
        <p className="text-xs text-muted-foreground text-center px-1">
          Registre produtos que o cliente pediu e a loja precisa repor, encomendar ou avisar quando chegar.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nova oportunidade</p>
        <button
          onClick={fechar}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* Cliente */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              WhatsApp *
            </label>
            <input
              className={inputClass}
              placeholder="(11) 99999-0000"
              value={form.cliente_whatsapp}
              onChange={e => set('cliente_whatsapp', formatarWhatsapp(e.target.value))}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Nome do cliente *
              {isBuscando && <span className="ml-1 font-normal text-muted-foreground">buscando…</span>}
            </label>
            <input
              className={inputClass}
              placeholder="Ex: Maria Silva"
              value={form.cliente_nome}
              onChange={e => set('cliente_nome', e.target.value)}
              onBlur={e => set('cliente_nome', normalizarNomePessoa(e.target.value))}
            />
          </div>
        </div>

        {/* Data */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Data do registro
          </label>
          <input
            className={inputClass}
            type="date"
            value={form.data_registro}
            max={hojeLocal()}
            onChange={e => set('data_registro', e.target.value)}
          />
        </div>

        {/* Produtos */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {itens.length === 1 ? 'Produto pedido *' : `Produtos pedidos * (${itens.length})`}
          </p>

          {itens.map((item, idx) => (
            <div key={item.key} className="rounded-lg border border-input bg-muted/20 p-3 space-y-2.5">
              {itens.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Produto {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removerItem(item.key)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remover produto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div>
                <input
                  className={inputClass}
                  list={`le-produtos-${item.key}`}
                  placeholder="Nome do produto que o cliente pediu"
                  value={item.produto_nome}
                  onChange={e => handleProdutoChange(item.key, e.target.value)}
                  onBlur={e => updateItem(item.key, { produto_nome: normalizarNomeProduto(e.target.value) })}
                />
                {produtos.length > 0 && (
                  <datalist id={`le-produtos-${item.key}`}>
                    {produtos.map(p => (
                      <option key={p.id} value={p.nome} />
                    ))}
                  </datalist>
                )}
                {item.sugestaoCatalogo && (
                  <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2 flex items-center justify-between gap-2">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Produto similar no catálogo: <strong>{item.sugestaoCatalogo.nome}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => usarSugestao(item.key, item.sugestaoCatalogo!)}
                      className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline"
                    >
                      Usar este
                    </button>
                  </div>
                )}
                {item.produtoExiste === false && !item.sugestaoCatalogo && item.produto_nome.trim().length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Novo produto será criado na loja ao adicionar à lista.
                  </p>
                )}
              </div>

              {categorias.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Categoria
                  </label>
                  <select
                    className={inputClass}
                    value={item.categoria_id}
                    onChange={e => updateItem(item.key, { categoria_id: e.target.value })}
                  >
                    <option value="">Sem categoria</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Valor potencial (R$)
                  </label>
                  <input
                    className={inputClass}
                    placeholder="0,00"
                    inputMode="decimal"
                    value={item.valor_potencial}
                    onChange={e => updateItem(item.key, { valor_potencial: e.target.value })}
                    onBlur={e => updateItem(item.key, { valor_potencial: formatarValorBRL(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Quantidade
                  </label>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={e => updateItem(item.key, { quantidade: e.target.value })}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={item.recorrente}
                  onChange={e => updateItem(item.key, { recorrente: e.target.checked })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span className="text-xs text-muted-foreground">Gerar recompra ao converter</span>
              </label>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setItens(prev => [...prev, novoItem()])}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar outro produto
          </button>
        </div>

        {/* Responsável */}
        {!isVendedora && vendedoras.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Responsável pela venda
            </label>
            <select
              className={inputClass}
              value={form.vendedora_id}
              onChange={e => set('vendedora_id', e.target.value)}
            >
              {vendedoras.map(v => (
                <option key={v.id} value={v.id}>{v.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Observação */}
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Observação
          </label>
          <textarea
            className={inputClass}
            rows={2}
            placeholder="Informações adicionais sobre o pedido"
            value={form.observacao}
            onChange={e => set('observacao', e.target.value)}
          />
          <p className="mt-1 text-[10px] text-muted-foreground/60 leading-snug">
            Não insira dados sensíveis, diagnósticos médicos ou informações desnecessárias.
          </p>
        </div>

        {erro && (
          <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {itens.length > 1 ? `Adicionar ${itens.length} produtos à lista` : 'Adicionar à lista'}
        </button>
      </form>
    </div>
  )
}
