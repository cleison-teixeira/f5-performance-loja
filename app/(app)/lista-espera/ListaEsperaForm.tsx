'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, CheckCircle } from 'lucide-react'
import { criarListaEspera } from './actions'
import { formatarWhatsapp, normalizarWhatsapp } from '@/lib/whatsapp/mask'

interface Categoria {
  id: string
  nome: string
}

interface Vendedora {
  id: string
  nome: string
}

interface Props {
  loja_id: string
  isVendedora: boolean
  defaultVendedoraId: string
  vendedoras: Vendedora[]
  categorias: Categoria[]
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function ListaEsperaForm({
  loja_id,
  isVendedora,
  defaultVendedoraId,
  vendedoras,
  categorias,
}: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const estadoInicial = {
    cliente_nome: '',
    cliente_whatsapp: '',
    produto_nome: '',
    categoria_id: '',
    valor_potencial: '',
    quantidade: '1',
    observacao: '',
    vendedora_id: defaultVendedoraId,
  }

  const [form, setForm] = useState(estadoInicial)

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function fechar() {
    setForm(estadoInicial)
    setErro(null)
    setSucesso(false)
    setAberto(false)
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

    startTransition(async () => {
      const res = await criarListaEspera({
        loja_id,
        cliente_nome: form.cliente_nome,
        cliente_whatsapp: whatsappDigits,
        produto_nome: form.produto_nome,
        categoria_id: form.categoria_id || undefined,
        valor_potencial: isNaN(valor as number) ? null : valor,
        quantidade: qtd,
        observacao: form.observacao || undefined,
        vendedora_id: form.vendedora_id,
      })
      if (res.ok) {
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
        <span className="text-sm font-medium">Oportunidade salva!</span>
      </div>
    )
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
      >
        <Plus className="h-4 w-4" />
        Adicionar à lista
      </button>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Nome do cliente *
            </label>
            <input
              className={inputClass}
              placeholder="Ex: Maria Silva"
              value={form.cliente_nome}
              onChange={e => set('cliente_nome', e.target.value)}
            />
          </div>
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
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Produto pedido *
          </label>
          <input
            className={inputClass}
            placeholder="Nome do produto que o cliente pediu"
            value={form.produto_nome}
            onChange={e => set('produto_nome', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Categoria
            </label>
            {categorias.length > 0 ? (
              <select
                className={inputClass}
                value={form.categoria_id}
                onChange={e => set('categoria_id', e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-muted-foreground py-2">
                Nenhuma categoria cadastrada. O responsável pela loja pode criar em Configurações.
              </p>
            )}
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
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          {!isVendedora && vendedoras.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Vendedora responsável
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
          Adicionar à lista
        </button>
      </form>
    </div>
  )
}
