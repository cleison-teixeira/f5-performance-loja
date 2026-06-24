'use client'

import { useState } from 'react'
import { Copy, Check, User, Package, Send } from 'lucide-react'
import { gerarLinkWhatsApp } from '@/lib/whatsapp/link'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'
import { marcarEnviado, editarTextoAviso } from './actions'
import { ConfirmarRecompraModal } from './ConfirmarRecompraModal'
import type { AvisoDetalhado } from './types'
import type { CatalogoProduto } from './page'

interface CardAvisoProps {
  aviso: AvisoDetalhado
  onMarcado: (id: string) => void
  catalogo: CatalogoProduto[]
  percentualComissao: number
  loja_id: string
  isVendedora: boolean
}

const TIPO_BADGE: Record<AvisoDetalhado['tipo'], string> = {
  agradecimento: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800/40',
  relacionamento: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40',
  recompra:       'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40',
  oferta:         'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40',
}

const TIPO_LABEL: Record<AvisoDetalhado['tipo'], string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
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

export function CardAviso({ aviso, onMarcado, catalogo, percentualComissao, loja_id, isVendedora }: CardAvisoProps) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [modalRecompra, setModalRecompra] = useState(false)
  const [textoAtual, setTextoAtual] = useState(aviso.texto_renderizado)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(aviso.texto_renderizado)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  function handleAbrirEdicao() {
    setRascunho(textoAtual)
    setErroEdicao(null)
    setEditando(true)
  }

  function handleCancelarEdicao() {
    setEditando(false)
    setErroEdicao(null)
  }

  async function handleSalvarEdicao() {
    if (!rascunho.trim()) return
    setSalvandoEdicao(true)
    setErroEdicao(null)
    const res = await editarTextoAviso(aviso.id, rascunho)
    setSalvandoEdicao(false)
    if (res.ok) {
      setTextoAtual(rascunho.trim())
      setEditando(false)
    } else {
      setErroEdicao(res.erro ?? 'Erro ao salvar')
    }
  }

  async function handleMarcarEnviado() {
    setLoading(true)
    setErro(null)
    const resultado = await marcarEnviado(aviso.id)
    setLoading(false)
    if (resultado.ok) {
      onMarcado(aviso.id)
    } else {
      setErro(resultado.erro ?? 'Erro ao marcar como enviado')
    }
  }

  function handleCopiar() {
    navigator.clipboard.writeText(textoAtual).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }).catch(() => {})
  }

  const linkWhatsApp = gerarLinkWhatsApp(aviso.cliente_whatsapp, textoAtual)
  const temporal = badgeTemporal(aviso.data_aviso)
  const isValorPotencial = aviso.tipo === 'recompra' || aviso.tipo === 'oferta'

  const cardCls = temporal.key === 'atrasado'
    ? 'border-rose-200/80 dark:border-rose-800/40 bg-rose-50/20 dark:bg-rose-950/5'
    : temporal.key === 'hoje'
    ? 'border-blue-200/60 dark:border-blue-800/30'
    : ''

  return (
    <>
      <div className={`rounded-xl border bg-card shadow-sm overflow-hidden ${cardCls}`}>

        {/* Faixa de urgência no topo para atrasados */}
        {temporal.key === 'atrasado' && (
          <div className="h-0.5 bg-gradient-to-r from-rose-400 to-red-500" />
        )}

        <div className="p-4 space-y-3.5">

          {/* ── Badges de status temporal + tipo + data ── */}
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
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TIPO_BADGE[aviso.tipo]}`}>
              {TIPO_LABEL[aviso.tipo]}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
              {formatarData(aviso.data_aviso)}
            </span>
          </div>

          {/* ── Cliente + thumbnail do produto ── */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold leading-tight truncate">{aviso.cliente_nome}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatarWhatsapp(aviso.cliente_whatsapp)}</p>
            </div>
            {aviso.produto_foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aviso.produto_foto_url}
                alt={aviso.produto_nome}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/60"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* ── Produto + valor potencial (só para recompra/oferta) ── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground truncate">{aviso.produto_nome}</span>
            {isValorPotencial && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  Potencial: {fmt(aviso.valor_venda)}
                </span>
              </>
            )}
          </div>

          {/* ── Vendedora responsável — apenas para Dono/Gerente ── */}
          {!isVendedora && aviso.vendedora_nome && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground/50 flex-none" />
              <span className="text-xs text-muted-foreground">
                Responsável: <span className="font-medium text-foreground">{aviso.vendedora_nome}</span>
              </span>
            </div>
          )}

          {/* ── Separador ── */}
          <div className="h-px bg-border/50" />

          {/* ── Área da mensagem ── */}
          {editando ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">
                Editando mensagem
              </p>
              <textarea
                value={rascunho}
                onChange={e => setRascunho(e.target.value)}
                rows={5}
                autoFocus
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-y leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {erroEdicao && <p className="text-xs text-destructive">{erroEdicao}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSalvarEdicao}
                  disabled={salvandoEdicao || !rascunho.trim()}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {salvandoEdicao ? 'Salvando…' : 'Salvar'}
                </button>
                <button
                  onClick={handleCancelarEdicao}
                  disabled={salvandoEdicao}
                  className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
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
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-3">
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{textoAtual}</p>
              </div>
              <button
                onClick={handleAbrirEdicao}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Editar mensagem
              </button>
            </div>
          )}

          {erro && <p className="text-xs text-destructive">{erro}</p>}

          {/* ── Ações ── */}
          {!editando && (
            <div className="flex flex-col gap-2 pt-0.5">

              {/* Primária: WhatsApp */}
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-700 active:scale-[0.98] transition-all"
              >
                <Send className="h-4 w-4 flex-none" />
                Enviar no WhatsApp
              </a>

              {/* Conversão + Operacional */}
              <div className="flex flex-col sm:flex-row gap-2">
                {(aviso.tipo === 'recompra' || aviso.tipo === 'oferta') && (
                  <button
                    onClick={() => setModalRecompra(true)}
                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors"
                  >
                    Confirmar recompra
                  </button>
                )}
                <button
                  onClick={handleMarcarEnviado}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Salvando…' : 'Marcar contato feito'}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

      {modalRecompra && (
        <ConfirmarRecompraModal
          aviso={aviso}
          catalogo={catalogo}
          percentualComissao={percentualComissao}
          loja_id={loja_id}
          onSucesso={(id) => { setModalRecompra(false); onMarcado(id) }}
          onFechar={() => setModalRecompra(false)}
        />
      )}
    </>
  )
}
