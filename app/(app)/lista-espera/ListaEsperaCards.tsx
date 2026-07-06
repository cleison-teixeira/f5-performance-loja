'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Pencil, Send, ClipboardList, ShieldOff } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { atualizarStatusListaEspera, buscarMembrosAtivosLoja, type StatusListaEspera } from './actions'
import { tocarCaixaRegistradora } from '@/lib/audio/caixaRegistradora'
import { StatusBadge, STATUS_LABELS } from './StatusBadge'
import { normalizarNome } from '@/lib/normalizar-nome'
import { gerarLinkWhatsApp } from '@/lib/whatsapp/link'
import dynamic from 'next/dynamic'

const ListaEsperaEditForm = dynamic(
  () => import('./ListaEsperaEditForm').then(m => ({ default: m.ListaEsperaEditForm })),
  { ssr: false }
)

export interface RegistroListaEspera {
  id: string
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  produto_id: string | null
  categoria_nome: string | null
  valor_potencial: number | null
  quantidade: number
  status: string
  observacao: string | null
  criado_em: string
  data_registro?: string | null
  vendedora_id: string | null
  vendedora_nome?: string
  loja_nome?: string
  nao_contatar?: boolean
}

type GrupoProduto = {
  key: string
  produto_id: string | null
  produto_nome: string
  qtdClientes: number
  qtdTotal: number
  qtdAguardando: number
  qtdAvisados: number
  valorPotencialAberto: number
  convertidoValor: number
  lojas: string[]
}

const ABERTO = new Set(['aguardando', 'encontrado_outra_loja', 'avisado'])
const COM_MENSAGEM = new Set(['aguardando', 'encontrado_outra_loja', 'avisado'])

function fmtData(iso: string) {
  const date = iso.includes('T') ? iso.split('T')[0] : iso
  const [ano, mes, dia] = date.split('-')
  return `${dia}/${mes}/${ano.slice(2)}`
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function gerarMensagem(registro: RegistroListaEspera, defaultLojaNome: string): string {
  const vendedora = (registro.vendedora_nome && registro.vendedora_nome !== '—')
    ? registro.vendedora_nome
    : 'nossa equipe'
  const loja = registro.loja_nome || defaultLojaNome
  return `Oi ${registro.cliente_nome}, tudo bem? Aqui é ${vendedora} da ${loja}. O produto que você tinha pedido chegou: ${registro.produto_nome}. Consegui separar para você. Quer que eu deixe reservado até o fim do dia?`
}

const selectClass =
  'rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function MensagemSugerida({
  mensagem,
  whatsapp,
  itemId,
  status,
  naoContatar,
}: {
  mensagem: string
  whatsapp: string
  itemId: string
  status: string
  naoContatar?: boolean
}) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(mensagem)
  const [textoAtual, setTextoAtual] = useState(mensagem)
  const [isPending, startTransition] = useTransition()

  const linkWhatsApp = gerarLinkWhatsApp(whatsapp, textoAtual)

  function handleCopiar() {
    navigator.clipboard.writeText(textoAtual).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }).catch(() => {})
  }

  function handleAbrirEdicao() {
    setRascunho(textoAtual)
    setEditando(true)
  }

  function handleSalvarEdicao() {
    setTextoAtual(rascunho)
    setEditando(false)
  }

  function handleEnviar() {
    window.open(linkWhatsApp, '_blank')
    if (status !== 'avisado') {
      startTransition(async () => {
        await atualizarStatusListaEspera(itemId, 'avisado')
        router.refresh()
      })
    }
  }

  return (
    <div className="border-t pt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
          Mensagem sugerida
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopiar}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {copiado ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
          <button
            onClick={handleAbrirEdicao}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="h-3 w-3" />
            <span>Editar</span>
          </button>
        </div>
      </div>

      {editando ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={5}
            value={rascunho}
            onChange={e => setRascunho(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvarEdicao}
              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{textoAtual}</p>
        </div>
      )}

      {naoContatar ? (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2 flex items-start gap-2">
            <ShieldOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Cliente marcado como Não Contatar. Evite enviar mensagens ativas para este cliente.
            </p>
          </div>
          <button
            disabled
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
          >
            <ShieldOff className="h-4 w-4 flex-none" />
            Contato bloqueado por opt-out
          </button>
        </>
      ) : (
        <button
          onClick={handleEnviar}
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          <Send className="h-4 w-4 flex-none" />
          {isPending ? 'Salvando…' : 'Enviar no WhatsApp'}
        </button>
      )}
    </div>
  )
}

function RegistroCard({
  registro,
  defaultLojaNome,
  vendedoras,
  produtos,
  podeEditar,
}: {
  registro: RegistroListaEspera
  defaultLojaNome: string
  vendedoras: Array<{ id: string; nome: string }>
  produtos: Array<{ id: string; nome: string }>
  podeEditar: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editando, setEditando] = useState(false)

  const [membros, setMembros] = useState<Array<{ id: string; nome: string }>>([])
  const [responsavelId, setResponsavelId] = useState<string>(registro.vendedora_id || '')
  const [statusTemp, setStatusTemp] = useState<string>(registro.status)

  useEffect(() => {
    if (statusTemp === 'convertido' && registro.status !== 'convertido' && membros.length === 0) {
      buscarMembrosAtivosLoja(registro.loja_id).then(res => {
        setMembros(res)
        if (res.length > 0 && !res.some(m => m.id === responsavelId)) {
          setResponsavelId(res[0].id)
        }
      }).catch(() => {})
    }
  }, [statusTemp, registro.status, registro.loja_id, membros.length, responsavelId])

  function handleStatusChange(valor: string) {
    setStatusTemp(valor)
    if (valor !== 'convertido') {
      startTransition(async () => {
        const res = await atualizarStatusListaEspera(registro.id, valor as StatusListaEspera)
        if (res.ok) {
          router.refresh()
        } else {
          alert(res.error || 'Erro ao atualizar status')
        }
      })
    }
  }

  function handleSalvarConversao() {
    startTransition(async () => {
      const res = await atualizarStatusListaEspera(registro.id, 'convertido', responsavelId)
      if (res.ok) {
        tocarCaixaRegistradora()
        router.refresh()
      } else {
        alert(res.error || 'Erro ao converter')
      }
    })
  }

  const mensagem = COM_MENSAGEM.has(registro.status)
    ? gerarMensagem(registro, defaultLojaNome)
    : null

  if (editando) {
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <ListaEsperaEditForm
          registro={registro}
          vendedoras={vendedoras}
          produtos={produtos}
          onClose={() => setEditando(false)}
          onSaved={() => setEditando(false)}
        />
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{registro.produto_nome}</p>
          {registro.categoria_nome && (
            <p className="text-xs text-muted-foreground mt-0.5">{registro.categoria_nome}</p>
          )}
        </div>
        <StatusBadge status={registro.status} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <p className="text-muted-foreground">Cliente</p>
          <p className="font-medium truncate">{registro.cliente_nome}</p>
        </div>
        <div>
          <p className="text-muted-foreground">WhatsApp</p>
          <p className="font-medium">{registro.cliente_whatsapp}</p>
        </div>
        {registro.valor_potencial !== null && (
          <div>
            <p className="text-muted-foreground">Valor potencial</p>
            <p className="font-medium text-emerald-600 dark:text-emerald-400">
              {fmtValor(registro.valor_potencial)}
            </p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Qtd</p>
          <p className="font-medium">{registro.quantidade}</p>
        </div>
        {registro.vendedora_nome && (
          <div>
            <p className="text-muted-foreground">Vendedora</p>
            <p className="font-medium truncate">{registro.vendedora_nome}</p>
          </div>
        )}
        {registro.loja_nome && (
          <div>
            <p className="text-muted-foreground">Loja</p>
            <p className="font-medium truncate">{registro.loja_nome}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Data do registro</p>
          <p className="font-medium">{fmtData(registro.data_registro ?? registro.criado_em)}</p>
        </div>
      </div>

      {registro.observacao && (
        <p className="text-xs text-muted-foreground border-t pt-2 leading-relaxed">
          {registro.observacao}
        </p>
      )}

      {registro.status === 'convertido' && (
        <div className="text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-2 mt-1">
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Responsável pela venda convertida</p>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{registro.vendedora_nome || '—'}</p>
        </div>
      )}

      {mensagem && (
        <MensagemSugerida
          mensagem={mensagem}
          whatsapp={registro.cliente_whatsapp}
          itemId={registro.id}
          status={registro.status}
          naoContatar={registro.nao_contatar}
        />
      )}

      <div className="flex items-center gap-2 border-t pt-2">
        <span className="text-xs text-muted-foreground shrink-0">Status:</span>
        <select
          className={selectClass}
          value={statusTemp}
          onChange={e => handleStatusChange(e.target.value)}
          disabled={isPending}
        >
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        {isPending && (
          <span className="text-xs text-muted-foreground">Salvando…</span>
        )}
        {podeEditar && (
          <button
            onClick={() => setEditando(true)}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
        )}
      </div>

      {statusTemp === 'convertido' && registro.status !== 'convertido' && (
        <div className="space-y-2">
          {membros.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                Responsável pela venda convertida
              </label>
              <select
                className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={responsavelId}
                onChange={e => setResponsavelId(e.target.value)}
                disabled={isPending}
              >
                {membros.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleSalvarConversao}
            disabled={isPending || !responsavelId}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isPending ? 'Convertendo…' : 'Confirmar Conversão em Venda'}
          </button>
        </div>
      )}
    </div>
  )
}

interface Props {
  registros: RegistroListaEspera[]
  defaultLojaNome?: string
  vendedoras?: Array<{ id: string; nome: string }>
  produtos?: Array<{ id: string; nome: string }>
  podeEditar?: boolean
}

export function ListaEsperaCards({
  registros,
  defaultLojaNome = '',
  vendedoras = [],
  produtos = [],
  podeEditar = false,
}: Props) {
  const [produtoFiltro, setProdutoFiltro] = useState('')

  const grupos = useMemo<GrupoProduto[]>(() => {
    const map = new Map<string, GrupoProduto>()
    for (const r of registros) {
      const key = r.produto_id ?? `nome:${normalizarNome(r.produto_nome)}`
      const entry = map.get(key) ?? {
        key,
        produto_id: r.produto_id,
        produto_nome: r.produto_nome,
        qtdClientes: 0,
        qtdTotal: 0,
        qtdAguardando: 0,
        qtdAvisados: 0,
        valorPotencialAberto: 0,
        convertidoValor: 0,
        lojas: [],
      }
      entry.qtdClientes++
      entry.qtdTotal += r.quantidade
      if (r.status === 'aguardando') entry.qtdAguardando++
      if (r.status === 'avisado') entry.qtdAvisados++
      if (ABERTO.has(r.status)) entry.valorPotencialAberto += r.valor_potencial ?? 0
      if (r.status === 'convertido') entry.convertidoValor += r.valor_potencial ?? 0
      if (r.loja_nome && !entry.lojas.includes(r.loja_nome)) entry.lojas.push(r.loja_nome)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort(
      (a, b) => b.qtdAguardando - a.qtdAguardando || b.qtdClientes - a.qtdClientes
    )
  }, [registros])

  const filtrados = useMemo(() => {
    if (!produtoFiltro) return registros
    return registros.filter(r => {
      const key = r.produto_id ?? `nome:${normalizarNome(r.produto_nome)}`
      return key === produtoFiltro
    })
  }, [registros, produtoFiltro])

  if (registros.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nenhuma oportunidade em espera ainda"
        description="Quando um cliente pedir algo que não tem na loja, cadastre aqui para não perder a venda."
      />
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Listas por produto ── */}
      {grupos.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Listas por produto
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {grupos.map(g => (
              <button
                key={g.key}
                onClick={() => setProdutoFiltro(produtoFiltro === g.key ? '' : g.key)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  produtoFiltro === g.key
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'bg-card shadow-sm hover:bg-muted/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug line-clamp-2 flex-1">
                    {g.produto_nome}
                  </p>
                  {g.qtdAguardando > 0 && (
                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                      {g.qtdAguardando} aguardando
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{g.qtdClientes} cliente{g.qtdClientes !== 1 ? 's' : ''}</span>
                  {g.valorPotencialAberto > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {fmtValor(g.valorPotencialAberto)} em aberto
                    </span>
                  )}
                  {g.qtdAvisados > 0 && (
                    <span className="text-purple-600 dark:text-purple-400">
                      {g.qtdAvisados} avisado{g.qtdAvisados !== 1 ? 's' : ''}
                    </span>
                  )}
                  {g.convertidoValor > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                      convertido {fmtValor(g.convertidoValor)}
                    </span>
                  )}
                  {g.lojas.map(l => (
                    <span key={l} className="font-medium text-foreground/70">{l}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtro por produto ── */}
      {grupos.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setProdutoFiltro('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !produtoFiltro
                ? 'bg-primary text-primary-foreground'
                : 'border border-input bg-transparent text-foreground hover:bg-accent'
            }`}
          >
            Todos ({registros.length})
          </button>
          {grupos.map(g => (
            <button
              key={g.key}
              onClick={() => setProdutoFiltro(produtoFiltro === g.key ? '' : g.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                produtoFiltro === g.key
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-input bg-transparent text-foreground hover:bg-accent'
              }`}
            >
              {g.produto_nome} ({g.qtdClientes})
            </button>
          ))}
        </div>
      )}

      {/* ── Clientes esperando ── */}
      <div className="space-y-1">
        {grupos.length > 1 && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {produtoFiltro
              ? `Clientes esperando · ${filtrados.length}`
              : `Todos os itens · ${filtrados.length}`}
          </p>
        )}
        {filtrados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum item para este produto.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {filtrados.map(r => (
              <RegistroCard
                key={r.id}
                registro={r}
                defaultLojaNome={defaultLojaNome}
                vendedoras={vendedoras}
                produtos={produtos}
                podeEditar={podeEditar}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
