'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { editarListaEspera, buscarClienteListaEspera, type StatusListaEspera } from './actions'
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
import { STATUS_LABELS } from './StatusBadge'
import type { RegistroListaEspera } from './ListaEsperaCards'

interface Vendedora { id: string; nome: string }
interface Produto { id: string; nome: string }

interface Props {
  registro: RegistroListaEspera
  vendedoras: Vendedora[]
  produtos: Produto[]
  onClose: () => void
  onSaved: () => void
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function encontrarSimilar(query: string, produtos: Produto[]): Produto | null {
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

export function ListaEsperaEditForm({ registro, vendedoras, produtos, onClose, onSaved }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isBuscando, startBuscaTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [produtoExiste, setProdutoExiste] = useState<boolean | null>(null)
  const [sugestaoCatalogo, setSugestaoCatalogo] = useState<Produto | null>(null)

  const [form, setForm] = useState({
    cliente_whatsapp: formatarWhatsapp(registro.cliente_whatsapp),
    cliente_nome: registro.cliente_nome,
    produto_nome: registro.produto_nome,
    valor_potencial: registro.valor_potencial != null
      ? registro.valor_potencial.toFixed(2).replace('.', ',')
      : '',
    quantidade: registro.quantidade.toString(),
    vendedora_id: registro.vendedora_id ?? (vendedoras[0]?.id ?? ''),
    observacao: registro.observacao ?? '',
    status: registro.status,
    data_registro: registro.data_registro ?? registro.criado_em.split('T')[0],
  })

  // Auto-lookup client by WhatsApp when it changes
  useEffect(() => {
    const digits = normalizarWhatsapp(form.cliente_whatsapp)
    if (digits.length < 10) return
    const original = normalizarWhatsapp(registro.cliente_whatsapp)
    if (digits === original) return // no change
    startBuscaTransition(async () => {
      const cliente = await buscarClienteListaEspera(digits, registro.loja_id)
      if (cliente) setForm(f => ({ ...f, cliente_nome: normalizarNomePessoa(cliente.nome) }))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cliente_whatsapp])

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleProdutoChange(valor: string) {
    set('produto_nome', valor)
    const norm = normalizarNome(valor)
    if (norm.length < 2) { setProdutoExiste(null); setSugestaoCatalogo(null); return }
    const exact = produtos.find(p => normalizarNome(p.nome) === norm)
    if (exact) { setProdutoExiste(true); setSugestaoCatalogo(null); return }
    setProdutoExiste(false)
    setSugestaoCatalogo(encontrarSimilar(valor, produtos))
  }

  function usarSugestao(p: Produto) {
    set('produto_nome', p.nome)
    setProdutoExiste(true)
    setSugestaoCatalogo(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!form.cliente_nome.trim() || !form.produto_nome.trim()) {
      setErro('Preencha nome do cliente e produto.')
      return
    }
    const whatsappDigits = normalizarWhatsapp(form.cliente_whatsapp)
    if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
      setErro('WhatsApp inválido. Use o formato (XX) XXXXX-XXXX.')
      return
    }

    const valor = form.valor_potencial
      ? parseFloat(form.valor_potencial.replace(/\./g, '').replace(',', '.'))
      : null
    const qtd = Math.max(1, parseInt(form.quantidade) || 1)
    const vendedoraId = form.vendedora_id || registro.vendedora_id || ''
    if (!vendedoraId) {
      setErro('Selecione a vendedora responsável.')
      return
    }

    startTransition(async () => {
      const res = await editarListaEspera({
        id: registro.id,
        loja_id: registro.loja_id,
        cliente_nome: form.cliente_nome,
        cliente_whatsapp: whatsappDigits,
        produto_nome: form.produto_nome,
        valor_potencial: isNaN(valor as number) ? null : valor,
        quantidade: qtd,
        observacao: form.observacao || undefined,
        vendedora_id: vendedoraId,
        status: form.status as StatusListaEspera,
        data_registro: form.data_registro || hojeLocal(),
      })
      if (res.ok) {
        if (form.status === 'convertido' && registro.status !== 'convertido') {
          tocarCaixaRegistradora()
        }
        router.refresh()
        onSaved()
      } else {
        setErro(res.error ?? 'Erro ao salvar.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Editar item</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

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

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Produto pedido *
        </label>
        <input
          className={inputClass}
          list="edit-lista-espera-produtos"
          placeholder="Nome do produto"
          value={form.produto_nome}
          onChange={e => handleProdutoChange(e.target.value)}
          onBlur={e => set('produto_nome', normalizarNomeProduto(e.target.value))}
        />
        {produtos.length > 0 && (
          <datalist id="edit-lista-espera-produtos">
            {produtos.map(p => <option key={p.id} value={p.nome} />)}
          </datalist>
        )}
        {sugestaoCatalogo && (
          <div className="mt-1.5 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Produto similar: <strong>{sugestaoCatalogo.nome}</strong>
            </p>
            <button
              type="button"
              onClick={() => usarSugestao(sugestaoCatalogo)}
              className="shrink-0 text-xs font-medium text-amber-700 dark:text-amber-400 underline hover:no-underline"
            >
              Usar este
            </button>
          </div>
        )}
        {produtoExiste === false && !sugestaoCatalogo && form.produto_nome.trim().length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Novo produto será criado na loja ao salvar.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Quantidade
          </label>
          <input
            className={inputClass}
            type="number"
            min="1"
            value={form.quantidade}
            onChange={e => set('quantidade', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Valor potencial (R$)
        </label>
        <input
          className={inputClass}
          placeholder="0,00"
          value={form.valor_potencial}
          onChange={e => set('valor_potencial', e.target.value)}
        />
      </div>

      {vendedoras.length > 0 && (
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

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Status
        </label>
        <select
          className={inputClass}
          value={form.status}
          onChange={e => set('status', e.target.value)}
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </button>
      </div>
    </form>
  )
}
