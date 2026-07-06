'use client'

import { useState } from 'react'
import { Send, CalendarClock, XCircle, Package, User, Layers, Copy, Check, Pencil, ShieldOff } from 'lucide-react'
import { gerarLinkWhatsApp } from '@/lib/whatsapp/link'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'
import { marcarEnviado } from './actions'
import dynamic from 'next/dynamic'

const ConfirmarRecompraModal = dynamic(
  () => import('./ConfirmarRecompraModal').then(m => ({ default: m.ConfirmarRecompraModal })),
  { ssr: false }
)
const ReagendarModal = dynamic(
  () => import('./ReagendarModal').then(m => ({ default: m.ReagendarModal })),
  { ssr: false }
)
const PerderOportunidadeModal = dynamic(
  () => import('./PerderOportunidadeModal').then(m => ({ default: m.PerderOportunidadeModal })),
  { ssr: false }
)
import type { AvisoDetalhado, GrupoRecompra } from './types'
import type { CatalogoProduto } from './page'
import type { VendedoraLoja } from './AvisosLista'

interface CardGrupoRecompraProps {
  grupo: GrupoRecompra
  onGrupoMarcado: (venda_id: string) => void
  onGrupoReagendado: (venda_id: string, novaData: string) => void
  catalogo: CatalogoProduto[]
  percentualComissao: number
  vendedorasLoja?: VendedoraLoja[]
  loja_id: string
  loja_nome: string
  isVendedora: boolean
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function badgeTemporal(dataAviso: string): { label: string; cls: string; key: string } {
  const hoje = hojeISO()
  if (dataAviso < hoje) return {
    key: 'atrasado',
    label: 'Atrasado',
    cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40',
  }
  if (dataAviso === hoje) return {
    key: 'hoje',
    label: 'Hoje',
    cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40',
  }
  const [ay, am, ad] = dataAviso.split('-').map(Number)
  const [hy, hm, hd] = hojeISO().split('-').map(Number)
  const diff = Math.round(
    (new Date(ay, am - 1, ad).getTime() - new Date(hy, hm - 1, hd).getTime()) / 86400000
  )
  if (diff === 1) return {
    key: 'amanha',
    label: 'Amanhã',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30',
  }
  return {
    key: 'futuro',
    label: `Em ${diff} dias`,
    cls: 'bg-muted text-muted-foreground border-border/60',
  }
}

function montarMensagemGrupoRecompra(cliente_nome: string, nomesProdutos: string[], loja_nome: string): string {
  const primeiroNome = cliente_nome.split(' ')[0]
  const lojaRef = loja_nome ? ` na ${loja_nome}` : ''

  if (nomesProdutos.length === 2) {
    return `Oi ${primeiroNome}! Passando para lembrar dos seus produtos: ${nomesProdutos[0]} e ${nomesProdutos[1]}. Posso separar para você${lojaRef}?`
  }
  return `Oi ${primeiroNome}! Passando para lembrar dos seus produtos de recompra. Posso separar para você${lojaRef}?`
}

export function CardGrupoRecompra({
  grupo,
  onGrupoMarcado,
  onGrupoReagendado,
  catalogo,
  percentualComissao,
  vendedorasLoja,
  loja_id,
  loja_nome,
  isVendedora,
}: CardGrupoRecompraProps) {
  const primaryAviso = grupo.avisos[0]

  // Use itens_venda for accurate product list; fallback to avisos for legacy data
  const produtos = grupo.itens_venda.length > 0
    ? grupo.itens_venda
    : grupo.avisos.map(a => ({
        id: a.id,
        produto_nome: a.produto_nome,
        produto_id: a.produto_id,
        produto_foto_url: a.produto_foto_url,
        valor_produto: a.valor_produto,
      }))

  const isContatoFeito = grupo.avisos.every(a => a.status === 'contato_feito' || (a.status === 'enviado' && !a.recompra_id))
  const [textoAtual, setTextoAtual] = useState(() =>
    montarMensagemGrupoRecompra(grupo.cliente_nome, produtos.map(p => p.produto_nome), loja_nome)
  )
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(textoAtual)
  const [copiado, setCopiado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [modalRecompra, setModalRecompra] = useState(false)
  const [modalReagendar, setModalReagendar] = useState(false)
  const [modalPerder, setModalPerder] = useState(false)

  // item_venda_id: null forces reagendar/perder to match by venda_id (affects all products in purchase)
  const representativeAviso: AvisoDetalhado = {
    ...primaryAviso,
    item_venda_id: null,
    produto_nome: produtos.length === 2
      ? `${produtos[0].produto_nome} e ${produtos[1].produto_nome}`
      : produtos.length > 2
        ? `${produtos.length} produtos de recompra`
        : produtos[0]?.produto_nome ?? primaryAviso.produto_nome,
  }

  const linkWhatsApp = gerarLinkWhatsApp(grupo.cliente_whatsapp, textoAtual)
  const temporal = badgeTemporal(grupo.data_aviso)

  const cardCls = temporal.key === 'atrasado'
    ? 'border-rose-200/80 dark:border-rose-800/40 bg-rose-50/20 dark:bg-rose-950/5'
    : temporal.key === 'hoje'
    ? 'border-blue-200/60 dark:border-blue-800/30'
    : ''

  function handleCopiar() {
    navigator.clipboard.writeText(textoAtual).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }).catch(() => {})
  }

  async function handleMarcarEnviado() {
    setLoading(true)
    setErro(null)
    const resultados = await Promise.all(grupo.avisos.map(a => marcarEnviado(a.id)))
    setLoading(false)
    const algumErro = resultados.find(r => !r.ok)
    if (algumErro) {
      setErro(algumErro.erro ?? 'Erro ao marcar contato feito')
      return
    }
    onGrupoMarcado(grupo.venda_id)
  }

  return (
    <>
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden ${cardCls}`}>
        {temporal.key === 'atrasado' && (
          <div className="h-0.5 bg-gradient-to-r from-rose-400 to-red-500" />
        )}

        <div className="p-4 space-y-3.5">

          {/* Badges: temporal + grupo + data */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${temporal.cls}`}>
              {temporal.key === 'atrasado' && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3 flex-none">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {temporal.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
              <Layers className="h-3 w-3" />
              {produtos.length} produtos
            </span>
            {isContatoFeito && (
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/30 dark:text-blue-400">
                Contato feito
              </span>
            )}
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {formatarData(grupo.data_aviso)}
            </span>
          </div>

          {/* Cliente */}
          <div>
            <p className="text-base font-bold leading-tight">{grupo.cliente_nome}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatarWhatsapp(grupo.cliente_whatsapp)}</p>
          </div>

          {/* Lista de produtos */}
          <div className="rounded-lg border border-border/50 bg-muted/20 divide-y divide-border/40">
            {produtos.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                {p.produto_foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.produto_foto_url}
                    alt={p.produto_nome}
                    className="w-9 h-9 rounded-lg object-cover shrink-0 border border-border/50"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                )}
                <span className="flex-1 text-sm text-foreground/80 truncate">{p.produto_nome}</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                  {fmt(p.valor_produto)}
                </span>
              </div>
            ))}
          </div>

          {/* Potencial total */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Potencial total</span>
            <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmt(grupo.valor_total)}
            </span>
          </div>

          {/* Vendedora responsável — apenas para Dono/Gerente */}
          {!isVendedora && grupo.vendedora_nome && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground/50 flex-none" />
              <span className="text-xs text-muted-foreground">
                Responsável: <span className="font-medium text-foreground">{grupo.vendedora_nome}</span>
              </span>
            </div>
          )}

          <div className="h-px bg-border/50" />

          {/* ── Mensagem sugerida ── */}
          {editando ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                Editando mensagem
              </p>
              <textarea
                value={rascunho}
                onChange={e => setRascunho(e.target.value)}
                rows={4}
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-y leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setTextoAtual(rascunho.trim()); setEditando(false) }}
                  disabled={!rascunho.trim()}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditando(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                  Mensagem sugerida
                </p>
                <div className="flex items-center gap-0.5">
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
                  <span className="text-border/60 select-none">|</span>
                  <button
                    onClick={() => { setRascunho(textoAtual); setEditando(true) }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{textoAtual}</p>
              </div>
            </div>
          )}

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          {/* ── Ações (ocultas durante edição) ── */}
          {!editando && (
            <div className="flex flex-col gap-2 pt-0.5">
              {grupo.nao_contatar ? (
                <>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800/40 px-3 py-2 flex items-start gap-2">
                    <ShieldOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-none mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      Cliente marcado como Não Contatar. Evite enviar mensagens ativas para este cliente.
                    </p>
                  </div>
                  <button
                    disabled
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                  >
                    <ShieldOff className="h-4 w-4 flex-none" />
                    Contato bloqueado por opt-out
                  </button>
                </>
              ) : (
                <a
                  href={linkWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 active:scale-[0.98] transition-all"
                >
                  <Send className="h-4 w-4 flex-none" />
                  Enviar no WhatsApp
                </a>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setModalRecompra(true)}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors"
                >
                  Confirmar recompra
                </button>
                <button
                  onClick={() => setModalReagendar(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <CalendarClock className="h-3.5 w-3.5 flex-none" />
                  Reagendar
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalPerder(true)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors"
                >
                  <XCircle className="h-3.5 w-3.5 flex-none" />
                  Não quer mais
                </button>
                {!isContatoFeito && (
                  <button
                    onClick={handleMarcarEnviado}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Salvando…' : 'Contato feito'}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {modalRecompra && (
        <ConfirmarRecompraModal
          aviso={primaryAviso}
          catalogo={catalogo}
          percentualComissao={percentualComissao}
          vendedorasLoja={vendedorasLoja}
          loja_id={loja_id}
          onSucesso={() => { setModalRecompra(false); onGrupoMarcado(grupo.venda_id) }}
          onFechar={() => setModalRecompra(false)}
          itensPreenchidos={produtos.map(p => ({ produto_id: p.produto_id, produto_nome: p.produto_nome, preco_unitario: p.valor_produto }))}
          item_venda_ids_grupo={grupo.itens_venda.length > 0
            ? grupo.itens_venda.map(i => i.id)
            : grupo.avisos.map(a => a.item_venda_id).filter((id): id is string => !!id)}
          isGrupo
        />
      )}

      {modalReagendar && (
        <ReagendarModal
          aviso={representativeAviso}
          onSucesso={(novaData) => { setModalReagendar(false); onGrupoReagendado(grupo.venda_id, novaData) }}
          onFechar={() => setModalReagendar(false)}
        />
      )}

      {modalPerder && (
        <PerderOportunidadeModal
          aviso={representativeAviso}
          onSucesso={() => { setModalPerder(false); onGrupoMarcado(grupo.venda_id) }}
          onFechar={() => setModalPerder(false)}
        />
      )}
    </>
  )
}
