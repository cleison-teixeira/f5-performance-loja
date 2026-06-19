'use client'

import { useState } from 'react'
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
}

const BADGE_CORES: Record<AvisoDetalhado['tipo'], string> = {
  agradecimento: 'bg-green-100 text-green-700 border-green-200',
  relacionamento: 'bg-blue-100 text-blue-700 border-blue-200',
  recompra: 'bg-amber-100 text-amber-700 border-amber-200',
  oferta: 'bg-violet-100 text-violet-700 border-violet-200',
}

const TIPO_LABEL: Record<AvisoDetalhado['tipo'], string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
}

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function statusTemporal(dataAviso: string): string {
  const hoje = hojeISO()
  if (dataAviso < hoje) return 'atrasado'
  if (dataAviso === hoje) return 'hoje'
  const [ay, am, ad] = dataAviso.split('-').map(Number)
  const [hy, hm, hd] = hoje.split('-').map(Number)
  const diff = Math.round((new Date(ay, am - 1, ad).getTime() - new Date(hy, hm - 1, hd).getTime()) / 86400000)
  if (diff === 1) return 'amanhã'
  return `em ${diff} dias`
}

const STATUS_CORES: Record<string, string> = {
  hoje: 'text-primary font-semibold',
  amanhã: 'text-foreground',
  atrasado: 'text-destructive font-medium',
}

export function CardAviso({ aviso, onMarcado, catalogo, percentualComissao, loja_id }: CardAvisoProps) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [modalRecompra, setModalRecompra] = useState(false)

  const [textoAtual, setTextoAtual] = useState(aviso.texto_renderizado)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(aviso.texto_renderizado)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [erroEdicao, setErroEdicao] = useState<string | null>(null)

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

  const linkWhatsApp = gerarLinkWhatsApp(aviso.cliente_whatsapp, textoAtual)

  return (
    <>
      <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_CORES[aviso.tipo]}`}>
            {TIPO_LABEL[aviso.tipo]}
          </span>
          <span className="text-xs text-muted-foreground">{formatarData(aviso.data_aviso)}</span>
          <span className={`text-xs ${STATUS_CORES[statusTemporal(aviso.data_aviso)] ?? 'text-muted-foreground'}`}>
            — {statusTemporal(aviso.data_aviso)}
          </span>
        </div>

        {/* Cliente + foto do produto */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold">{aviso.cliente_nome}</p>
            <p className="text-xs text-muted-foreground">{formatarWhatsapp(aviso.cliente_whatsapp)}</p>
          </div>
          {aviso.produto_foto_url && (
            <img
              src={aviso.produto_foto_url}
              alt={aviso.produto_nome}
              className="w-12 h-12 rounded-md object-cover shrink-0 border"
            />
          )}
        </div>

        {/* Produto + valor da venda + previsão de comissão */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Produto: </span>
            <span className="font-medium">{aviso.produto_nome}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Venda original: </span>
            <span className="font-medium">{formatarBRL(aviso.valor_venda)}</span>
          </span>
          {aviso.previsao_comissao > 0 && (
            <span>
              <span className="text-muted-foreground">Previsão se recomprar: </span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{formatarBRL(aviso.previsao_comissao)}</span>
            </span>
          )}
        </div>

        {/* Texto da mensagem */}
        {editando ? (
          <div className="space-y-2">
            <textarea
              value={rascunho}
              onChange={e => setRascunho(e.target.value)}
              rows={5}
              autoFocus
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {erroEdicao && <p className="text-xs text-destructive">{erroEdicao}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleSalvarEdicao}
                disabled={salvandoEdicao || !rascunho.trim()}
                className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {salvandoEdicao ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                onClick={handleCancelarEdicao}
                disabled={salvandoEdicao}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 p-3 space-y-2">
            <p className="text-sm whitespace-pre-wrap">{textoAtual}</p>
            <button
              onClick={handleAbrirEdicao}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
            >
              Editar mensagem
            </button>
          </div>
        )}

        {erro && <p className="text-xs text-destructive">{erro}</p>}

        {/* Botões de ação */}
        {!editando && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={linkWhatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
            >
              Enviar pelo WhatsApp
            </a>
            <button
              onClick={() => setModalRecompra(true)}
              className="inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Confirmar Recompra
            </button>
            <button
              onClick={handleMarcarEnviado}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Marcar como enviado'}
            </button>
          </div>
        )}
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
