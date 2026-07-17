'use client'

import { useState, useMemo, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Pencil, Send, ClipboardList, ShieldOff, Package, Network } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  atualizarStatusListaEspera,
  atualizarStatusGrupoListaEspera,
  buscarMembrosAtivosLoja,
  type StatusListaEspera,
} from './actions'
import { tocarCaixaRegistradora } from '@/lib/audio/caixaRegistradora'
import { StatusBadge, STATUS_LABELS } from './StatusBadge'
import { normalizarNome } from '@/lib/normalizar-nome'
import { normalizarNomePessoa, normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'
import { gerarLinkWhatsApp } from '@/lib/whatsapp/link'
import dynamic from 'next/dynamic'

const ListaEsperaEditForm = dynamic(
  () => import('./ListaEsperaEditForm').then(m => ({ default: m.ListaEsperaEditForm })),
  { ssr: false }
)

const BuscarNaRedeModal = dynamic(
  () => import('./BuscarNaRedeModal').then(m => ({ default: m.BuscarNaRedeModal })),
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
  grupo_pedido_id?: string | null
  recorrente?: boolean
  ciclo_recompra_dias?: number | null
  qtd_mensagens?: number | null
  demanda_ativa?: { id: string; status: string } | null
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

type GrupoPedido = {
  chave: string
  grupo_pedido_id: string | null
  loja_id: string
  cliente_nome: string
  cliente_whatsapp: string
  vendedora_id: string | null
  vendedora_nome: string
  loja_nome?: string
  data_registro: string | null
  nao_contatar: boolean
  itens: RegistroListaEspera[]
  statusPrincipal: string
  valorTotal: number
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ABERTO = new Set(['aguardando', 'encontrado_outra_loja', 'avisado'])
const COM_MENSAGEM = new Set(['aguardando', 'encontrado_outra_loja', 'avisado'])
const STATUS_PRIORITY: Record<string, number> = {
  aguardando: 0, encontrado_outra_loja: 1, avisado: 2, convertido: 3, perdido: 4,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  const date = iso.includes('T') ? iso.split('T')[0] : iso
  const [ano, mes, dia] = date.split('-')
  return `${dia}/${mes}/${ano.slice(2)}`
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function gerarMensagemGrupo(grupo: GrupoPedido, defaultLojaNome: string): string {
  const vendedora = grupo.vendedora_nome !== '—' ? grupo.vendedora_nome : 'nossa equipe'
  const loja = grupo.loja_nome || defaultLojaNome
  const primeiroNome = grupo.cliente_nome.split(' ')[0]

  if (grupo.itens.length === 1) {
    const item = grupo.itens[0]
    return `Oi ${primeiroNome}, tudo bem? Aqui é ${vendedora} da ${loja}. O produto que você tinha pedido chegou: ${normalizarNomeProduto(item.produto_nome)}. Consegui separar para você. Quer que eu deixe reservado até o fim do dia?`
  }

  const listaProdutos = grupo.itens
    .map(i => `- ${normalizarNomeProduto(i.produto_nome)}`)
    .join('\n')
  return `Oi ${primeiroNome}, tudo bem? Aqui é ${vendedora} da ${loja}.\nOs produtos que você tinha pedido chegaram:\n${listaProdutos}\n\nConsegui separar para você. Quer que eu deixe reservado até o fim do dia?`
}

const selectClass =
  'rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

// ─── MensagemSugerida ─────────────────────────────────────────────────────────

function MensagemSugerida({
  mensagem,
  whatsapp,
  itemIds,
  lojaId,
  status,
  naoContatar,
}: {
  mensagem: string
  whatsapp: string
  itemIds: string[]
  lojaId: string
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

  function handleSalvarEdicao() {
    setTextoAtual(rascunho)
    setEditando(false)
  }

  function handleEnviar() {
    window.open(linkWhatsApp, '_blank')
    if (status !== 'avisado') {
      startTransition(async () => {
        await atualizarStatusGrupoListaEspera(itemIds, 'avisado', lojaId)
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
            onClick={() => { setRascunho(textoAtual); setEditando(true) }}
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

// ─── GrupoPedidoCard ──────────────────────────────────────────────────────────

function BuscarNaRedeButton({
  item,
  lojaId,
  lojaNome,
  userId,
  userNome,
}: {
  item: RegistroListaEspera
  lojaId: string
  lojaNome: string
  userId: string
  userNome: string
}) {
  const [aberto, setAberto] = useState(false)
  const demandaAtiva = item.demanda_ativa ?? null

  return (
    <>
      {aberto && (
        <BuscarNaRedeModal
          itemId={item.id}
          produtoNome={item.produto_nome}
          produtoId={item.produto_id}
          quantidade={item.quantidade}
          lojaId={lojaId}
          lojaNome={lojaNome}
          responsavelId={item.vendedora_id}
          responsavelNome={item.vendedora_nome ?? '—'}
          demandaAtiva={demandaAtiva}
          onClose={() => setAberto(false)}
        />
      )}
      {demandaAtiva ? (
        <button
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
        >
          <Network className="h-3 w-3" />
          Em busca na rede
        </button>
      ) : (
        <button
          onClick={() => setAberto(true)}
          className="inline-flex items-center gap-1 rounded-md border border-input px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Network className="h-3 w-3" />
          Buscar na rede
        </button>
      )}
    </>
  )
}

function GrupoPedidoCard({
  grupo,
  defaultLojaNome,
  vendedoras,
  produtos,
  podeEditar,
  temRedeMultiLoja,
  lojaId,
  lojaNome,
  userId,
  userNome,
}: {
  grupo: GrupoPedido
  defaultLojaNome: string
  vendedoras: Array<{ id: string; nome: string }>
  produtos: Array<{ id: string; nome: string }>
  podeEditar: boolean
  temRedeMultiLoja: boolean
  lojaId: string
  lojaNome: string
  userId: string
  userNome: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [membros, setMembros] = useState<Array<{ id: string; nome: string }>>([])
  const [responsavelId, setResponsavelId] = useState<string>(grupo.vendedora_id || '')
  const [statusTemp, setStatusTemp] = useState<string>(grupo.statusPrincipal)

  useEffect(() => { setStatusTemp(grupo.statusPrincipal) }, [grupo.statusPrincipal])

  useEffect(() => {
    if (statusTemp === 'convertido' && grupo.statusPrincipal !== 'convertido' && membros.length === 0) {
      buscarMembrosAtivosLoja(grupo.loja_id).then(res => {
        setMembros(res)
        if (res.length > 0 && !res.some(m => m.id === responsavelId)) {
          setResponsavelId(res[0].id)
        }
      }).catch(() => {})
    }
  }, [statusTemp, grupo.statusPrincipal, grupo.loja_id, membros.length, responsavelId])

  const ids = grupo.itens.map(i => i.id)

  function handleStatusChange(valor: string) {
    setStatusTemp(valor)
    if (valor !== 'convertido') {
      startTransition(async () => {
        const res = await atualizarStatusGrupoListaEspera(ids, valor as StatusListaEspera, grupo.loja_id)
        if (res.ok) {
          router.refresh()
        } else {
          alert(res.error || 'Erro ao atualizar status')
          setStatusTemp(grupo.statusPrincipal)
        }
      })
    }
  }

  function handleSalvarConversao() {
    startTransition(async () => {
      const res = await atualizarStatusGrupoListaEspera(ids, 'convertido', grupo.loja_id, responsavelId)
      if (res.ok) {
        tocarCaixaRegistradora()
        router.refresh()
      } else {
        alert(res.error || 'Erro ao converter')
        setStatusTemp(grupo.statusPrincipal)
      }
    })
  }

  const mensagem = COM_MENSAGEM.has(grupo.statusPrincipal)
    ? gerarMensagemGrupo(grupo, defaultLojaNome)
    : null

  const isGrupo = grupo.itens.length > 1
  const valorTotal = grupo.itens.reduce((acc, i) => acc + (i.valor_potencial ?? 0) * Math.max(i.quantidade || 1, 1), 0)

  // Se estiver editando um item específico
  if (editandoId) {
    const itemEditando = grupo.itens.find(i => i.id === editandoId)
    if (itemEditando) {
      return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <ListaEsperaEditForm
            registro={itemEditando}
            vendedoras={vendedoras}
            produtos={produtos}
            onClose={() => setEditandoId(null)}
            onSaved={() => setEditandoId(null)}
          />
        </div>
      )
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {normalizarNomePessoa(grupo.cliente_nome)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{grupo.cliente_whatsapp}</p>
        </div>
        <StatusBadge status={grupo.statusPrincipal} />
      </div>

      {/* ── Lista de produtos do pedido ── */}
      <div className={`space-y-1.5 ${isGrupo ? 'rounded-lg bg-muted/40 p-3' : ''}`}>
        {isGrupo && (
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em] mb-2">
            {grupo.itens.length} produtos neste pedido
          </p>
        )}
        {grupo.itens.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {normalizarNomeProduto(item.produto_nome)}
                </p>
                {item.categoria_nome && (
                  <p className="text-[11px] text-muted-foreground">{item.categoria_nome}</p>
                )}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
              {item.valor_potencial !== null && (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                  {item.quantidade > 1
                    ? `×${item.quantidade} · ${fmtValor((item.valor_potencial ?? 0) * item.quantidade)}`
                    : fmtValor(item.valor_potencial)}
                </span>
              )}
              {temRedeMultiLoja && podeEditar && (
                <BuscarNaRedeButton
                  item={item}
                  lojaId={lojaId}
                  lojaNome={lojaNome}
                  userId={userId}
                  userNome={userNome}
                />
              )}
              {podeEditar && (
                <button
                  onClick={() => setEditandoId(item.id)}
                  className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        {isGrupo && valorTotal > 0 && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/60">
            <p className="text-xs text-muted-foreground">Valor total potencial</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtValor(valorTotal)}</p>
          </div>
        )}
      </div>

      {/* ── Detalhes ── */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {grupo.vendedora_nome && grupo.vendedora_nome !== '—' && (
          <div>
            <p className="text-muted-foreground">Vendedora</p>
            <p className="font-medium truncate">{grupo.vendedora_nome}</p>
          </div>
        )}
        {grupo.loja_nome && (
          <div>
            <p className="text-muted-foreground">Loja</p>
            <p className="font-medium truncate">{grupo.loja_nome}</p>
          </div>
        )}
        {grupo.data_registro && (
          <div>
            <p className="text-muted-foreground">Data do registro</p>
            <p className="font-medium">{fmtData(grupo.data_registro)}</p>
          </div>
        )}
        {grupo.itens[0]?.observacao && (
          <div className="col-span-2">
            <p className="text-muted-foreground">Observação</p>
            <p className="leading-relaxed">{grupo.itens[0].observacao}</p>
          </div>
        )}
      </div>

      {/* ── Responsável pela venda convertida ── */}
      {grupo.statusPrincipal === 'convertido' && (
        <div className="text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg p-2">
          <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Responsável pela venda convertida</p>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">{grupo.vendedora_nome || '—'}</p>
        </div>
      )}

      {/* ── Mensagem e botão WhatsApp ── */}
      {mensagem && (
        <MensagemSugerida
          mensagem={mensagem}
          whatsapp={grupo.cliente_whatsapp}
          itemIds={ids}
          lojaId={grupo.loja_id}
          status={grupo.statusPrincipal}
          naoContatar={grupo.nao_contatar}
        />
      )}

      {/* ── Controles de status ── */}
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
        {isPending && <span className="text-xs text-muted-foreground">Salvando…</span>}
      </div>

      {/* ── Confirmação de conversão ── */}
      {statusTemp === 'convertido' && grupo.statusPrincipal !== 'convertido' && (
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

// ─── Props e componente principal ─────────────────────────────────────────────

interface Props {
  registros: RegistroListaEspera[]
  defaultLojaNome?: string
  vendedoras?: Array<{ id: string; nome: string }>
  produtos?: Array<{ id: string; nome: string }>
  podeEditar?: boolean
  temRedeMultiLoja?: boolean
  lojaId?: string
  lojaNome?: string
  userId?: string
  userNome?: string
}

export function ListaEsperaCards({
  registros,
  defaultLojaNome = '',
  vendedoras = [],
  produtos = [],
  podeEditar = false,
  temRedeMultiLoja = false,
  lojaId = '',
  lojaNome = '',
  userId = '',
  userNome = '',
}: Props) {
  const [produtoFiltro, setProdutoFiltro] = useState('')

  // ── "Listas por produto" — agrupamento para inteligência de compra ──────────
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
      if (ABERTO.has(r.status)) entry.valorPotencialAberto += (r.valor_potencial ?? 0) * Math.max(r.quantidade || 1, 1)
      if (r.status === 'convertido') entry.convertidoValor += (r.valor_potencial ?? 0) * Math.max(r.quantidade || 1, 1)
      if (r.loja_nome && !entry.lojas.includes(r.loja_nome)) entry.lojas.push(r.loja_nome)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort(
      (a, b) => b.qtdAguardando - a.qtdAguardando || b.qtdClientes - a.qtdClientes
    )
  }, [registros])

  // ── Grupos de pedido — para exibição de cards agrupados ─────────────────────
  const grupoPedidos = useMemo<GrupoPedido[]>(() => {
    const map = new Map<string, GrupoPedido>()
    for (const r of registros) {
      // grupo_pedido_id preenchido = pedidos multi-produto novos
      // null = fallback derivado por (loja + whatsapp + vendedora + data_registro)
      const chave = r.grupo_pedido_id
        ? `g:${r.grupo_pedido_id}`
        : `d:${r.loja_id}:${r.cliente_whatsapp}:${r.vendedora_id ?? ''}:${r.data_registro ?? r.criado_em.split('T')[0]}`

      const entry = map.get(chave) ?? {
        chave,
        grupo_pedido_id: r.grupo_pedido_id ?? null,
        loja_id: r.loja_id,
        cliente_nome: r.cliente_nome,
        cliente_whatsapp: r.cliente_whatsapp,
        vendedora_id: r.vendedora_id,
        vendedora_nome: r.vendedora_nome ?? '—',
        loja_nome: r.loja_nome,
        data_registro: r.data_registro ?? null,
        nao_contatar: r.nao_contatar ?? false,
        itens: [],
        statusPrincipal: r.status,
        valorTotal: 0,
      }
      entry.itens.push(r)
      entry.valorTotal += (r.valor_potencial ?? 0) * Math.max(r.quantidade || 1, 1)
      if (r.nao_contatar) entry.nao_contatar = true
      map.set(chave, entry)
    }

    // statusPrincipal = status com maior prioridade de ação no grupo
    return Array.from(map.values()).map(g => ({
      ...g,
      statusPrincipal: g.itens.reduce((best, item) => {
        return (STATUS_PRIORITY[item.status] ?? 99) < (STATUS_PRIORITY[best] ?? 99)
          ? item.status : best
      }, g.itens[0].status),
    })).sort((a, b) => {
      const pa = STATUS_PRIORITY[a.statusPrincipal] ?? 99
      const pb = STATUS_PRIORITY[b.statusPrincipal] ?? 99
      return pa - pb || a.cliente_nome.localeCompare(b.cliente_nome)
    })
  }, [registros])

  // ── Filtro por produto — exibe grupo completo se qualquer item bate ─────────
  const grupoPedidosFiltrados = useMemo(() => {
    if (!produtoFiltro) return grupoPedidos
    return grupoPedidos.filter(g =>
      g.itens.some(r => {
        const key = r.produto_id ?? `nome:${normalizarNome(r.produto_nome)}`
        return key === produtoFiltro
      })
    )
  }, [grupoPedidos, produtoFiltro])

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
                    {normalizarNomeProduto(g.produto_nome)}
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
              {normalizarNomeProduto(g.produto_nome)} ({g.qtdClientes})
            </button>
          ))}
        </div>
      )}

      {/* ── Cards de pedidos agrupados ── */}
      <div className="space-y-1">
        {grupos.length > 1 && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {produtoFiltro
              ? `Pedidos com este produto · ${grupoPedidosFiltrados.length}`
              : `Pedidos em espera · ${grupoPedidos.length}`}
          </p>
        )}
        {grupoPedidosFiltrados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum pedido para este produto.
          </p>
        ) : (
          <div className="space-y-3 pt-1">
            {grupoPedidosFiltrados.map(g => (
              <GrupoPedidoCard
                key={g.chave}
                grupo={g}
                defaultLojaNome={defaultLojaNome}
                vendedoras={vendedoras}
                produtos={produtos}
                podeEditar={podeEditar}
                temRedeMultiLoja={temRedeMultiLoja}
                lojaId={lojaId}
                lojaNome={lojaNome}
                userId={userId}
                userNome={userNome}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
