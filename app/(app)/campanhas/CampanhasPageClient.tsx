'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Package2, CalendarDays, Users, Target, ChevronRight,
  Megaphone, Clock, Sparkles, AlertTriangle, WifiOff, Pencil,
} from 'lucide-react'
import { atualizarStatusCampanha } from './actions'
import type { CampanhaVenda, StatusCampanha } from './types'
import { TIPO_LABELS, STATUS_LABELS, STATUS_CORES, UNIDADE_LABELS } from './types'

interface ModeloCard {
  tipo: string
  label: string
  descricao: string
  disponivel: boolean
}

const MODELOS: ModeloCard[] = [
  {
    tipo: 'acao_granel',
    label: 'Ação do Granel',
    descricao: 'Pacotes fechados prontos para venda, com meta por unidade.',
    disponivel: true,
  },
  {
    tipo: 'produto_mes',
    label: 'Produto do mês',
    descricao: 'Destaque um produto com meta mensal.',
    disponivel: true,
  },
  {
    tipo: 'lancamento',
    label: 'Lançamento',
    descricao: 'Mobilize a equipe para um novo produto.',
    disponivel: true,
  },
  {
    tipo: 'desafio_vendas',
    label: 'Desafio de vendas',
    descricao: 'Ranking e meta coletiva com prazo.',
    disponivel: false,
  },
]

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function fmtData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano.slice(2)}`
}

function StatusBadge({ status }: { status: StatusCampanha }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CORES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function CampanhaCard({
  campanha,
  lojaId,
  podeGerenciar,
  onStatusChange,
}: {
  campanha: CampanhaVenda
  lojaId: string
  podeGerenciar: boolean
  onStatusChange: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [erroStatus, setErroStatus] = useState<string | null>(null)

  const itensAtivos = campanha.itens.filter(i => i.ativo)
  const participantesAtivos = campanha.participantes.filter(p => p.ativo)

  async function handleStatusChange(novoStatus: StatusCampanha) {
    setPending(true)
    setErroStatus(null)
    const res = await atualizarStatusCampanha(campanha.id, lojaId, novoStatus)
    setPending(false)
    if (res.ok) {
      onStatusChange()
      router.refresh()
    } else {
      setErroStatus(res.error ?? 'Erro ao alterar status.')
    }
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Link href={`/campanhas/${campanha.id}`} className="block p-4 hover:bg-accent/30 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={campanha.status} />
              <span className="text-[10px] text-muted-foreground">{TIPO_LABELS[campanha.tipo]}</span>
            </div>
            <h3 className="font-semibold text-sm mt-1 truncate">{campanha.nome}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtData(campanha.data_inicio)} → {fmtData(campanha.data_fim)}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            <p className="text-base font-bold tabular-nums">{itensAtivos.length}</p>
            <p className="text-[10px] text-muted-foreground">
              Produto{itensAtivos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            <p className="text-base font-bold tabular-nums">{participantesAtivos.length}</p>
            <p className="text-[10px] text-muted-foreground">
              Participante{participantesAtivos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 px-2 py-1.5">
            <p className="text-base font-bold tabular-nums">
              {campanha.meta_loja ?? campanha.meta_individual ?? '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Meta/{campanha.periodicidade === 'diaria' ? 'dia' : 'período'}
            </p>
          </div>
        </div>

        {itensAtivos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {itensAtivos.slice(0, 3).map(item => (
              <span key={item.id} className="text-[10px] bg-muted/60 text-muted-foreground rounded px-1.5 py-0.5 truncate max-w-[120px]">
                {item.produto_nome}
              </span>
            ))}
            {itensAtivos.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{itensAtivos.length - 3}</span>
            )}
          </div>
        )}
      </Link>

      {podeGerenciar && (
        <div className="border-t px-4 py-2 flex gap-2 flex-wrap">
          {erroStatus && (
            <p className="w-full text-xs text-red-600 dark:text-red-400">{erroStatus}</p>
          )}
          {['rascunho', 'programada', 'ativa', 'pausada'].includes(campanha.status) && (
            <Link
              href={`/campanhas/${campanha.id}/editar`}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </Link>
          )}
          {campanha.status === 'rascunho' && (
            <button
              onClick={() => handleStatusChange('ativa')}
              disabled={pending}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
            >
              Ativar
            </button>
          )}
          {campanha.status === 'programada' && (
            <button
              onClick={() => handleStatusChange('ativa')}
              disabled={pending}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
            >
              Ativar agora
            </button>
          )}
          {campanha.status === 'ativa' && (
            <>
              <button
                onClick={() => handleStatusChange('pausada')}
                disabled={pending}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline disabled:opacity-50"
              >
                Pausar
              </button>
              <button
                onClick={() => handleStatusChange('encerrada')}
                disabled={pending}
                className="text-xs font-semibold text-muted-foreground hover:underline disabled:opacity-50"
              >
                Encerrar
              </button>
            </>
          )}
          {campanha.status === 'pausada' && (
            <button
              onClick={() => handleStatusChange('ativa')}
              disabled={pending}
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
            >
              Reativar
            </button>
          )}
          {['rascunho', 'programada', 'ativa', 'pausada'].includes(campanha.status) && (
            <button
              onClick={() => handleStatusChange('cancelada')}
              disabled={pending}
              className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 ml-auto"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface Props {
  campanhas: CampanhaVenda[]
  lojaId: string
  lojaNome: string
  podeGerenciar: boolean
  erro?: string
  schemaDesatualizado?: boolean
}

const ORDEM_STATUS: StatusCampanha[] = ['ativa', 'programada', 'rascunho', 'pausada', 'encerrada']

export function CampanhasPageClient({ campanhas, lojaId, lojaNome, podeGerenciar, erro, schemaDesatualizado }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')

  const campanhasAtivas = campanhas.filter(c => ['ativa', 'programada', 'rascunho', 'pausada'].includes(c.status))
  const campanhasHistorico = campanhas.filter(c => ['encerrada', 'cancelada'].includes(c.status))
  const lista = tab === 'ativas' ? campanhasAtivas : campanhasHistorico

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Campanhas de Venda</h1>
          <p className="text-sm text-muted-foreground">{lojaNome}</p>
        </div>
        {podeGerenciar && (
          <Link
            href="/campanhas/nova"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Nova campanha
          </Link>
        )}
      </div>

      {/* Banner de erro estrutural */}
      {erro && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 flex items-start gap-3">
          <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Campanhas temporariamente indisponíveis</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
              Não foi possível carregar a lista de campanhas. Tente novamente em instantes ou contate o suporte.
            </p>
          </div>
        </div>
      )}

      {/* Banner de compatibilidade V1 */}
      {schemaDesatualizado && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Atualização pendente</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
              Os dados de premiação e materiais não estão disponíveis até a conclusão da atualização do sistema.
              As campanhas existentes estão íntegras.
            </p>
          </div>
        </div>
      )}

      {/* Modelos */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipos de campanha</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODELOS.map(m => (
            <div
              key={m.tipo}
              className={`rounded-xl border p-3 space-y-1 ${m.disponivel ? 'border-primary/30 bg-primary/5' : 'opacity-50'}`}
            >
              <div className="flex items-center gap-1.5">
                <Megaphone className={`h-3.5 w-3.5 shrink-0 ${m.disponivel ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-xs font-semibold">{m.label}</span>
                {!m.disponivel && (
                  <span className="ml-auto text-[9px] font-medium text-muted-foreground bg-muted rounded px-1">Em breve</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug">{m.descricao}</p>
              {m.disponivel && podeGerenciar && (
                <Link
                  href={`/campanhas/nova?tipo=${m.tipo}`}
                  className="inline-flex text-[10px] font-semibold text-primary hover:underline mt-0.5"
                >
                  Criar →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['ativas', 'historico'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'ativas' ? `Em andamento (${campanhasAtivas.length})` : `Histórico (${campanhasHistorico.length})`}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Megaphone className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            {tab === 'ativas' ? 'Nenhuma campanha em andamento.' : 'Nenhum histórico ainda.'}
          </p>
          {tab === 'ativas' && podeGerenciar && (
            <Link
              href="/campanhas/nova?tipo=acao_granel"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Criar Ação do Granel
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lista
            .sort((a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status))
            .map(campanha => (
              <CampanhaCard
                key={campanha.id}
                campanha={campanha}
                lojaId={lojaId}
                podeGerenciar={podeGerenciar}
                onStatusChange={() => router.refresh()}
              />
            ))}
        </div>
      )}
    </div>
  )
}
