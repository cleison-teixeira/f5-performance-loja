'use client'

import { useState, useTransition, useMemo } from 'react'
import { salvarMetaAdocao, type MetaAdocaoInput } from './actions'
import type { LojaAdocao, InfoFinanceira } from './page'

// ── helpers ──────────────────────────────────────────────────────────────────

function diasNoMes(hoje: string) {
  const [ano, mes] = hoje.split('-').map(Number)
  return new Date(ano, mes, 0).getDate()
}

function diaAtual(hoje: string) {
  return Number(hoje.split('-')[2])
}

function calcularStatus(cadastradasMes: number, esperadoAteHoje: number, temMeta: boolean) {
  if (!temMeta || esperadoAteHoje === 0) return 'sem_meta'
  const pct = cadastradasMes / esperadoAteHoje
  if (pct >= 0.8) return 'em_ritmo'
  if (pct >= 0.5) return 'atencao'
  return 'critico'
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  sem_meta: { label: 'Sem meta', cls: 'bg-zinc-100 text-zinc-500' },
  em_ritmo: { label: 'Em ritmo', cls: 'bg-green-100 text-green-700' },
  atencao:  { label: 'Atenção',  cls: 'bg-yellow-100 text-yellow-700' },
  critico:  { label: 'Crítico',  cls: 'bg-red-100 text-red-700' },
}

function Badge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? STATUS_LABEL.sem_meta
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ── Helpers financeiros ───────────────────────────────────────────────────────

type StatusFinanceiro = 'em_dia' | 'atrasada' | 'trial' | 'cortesia' | 'cancelada' | 'pendente' | 'implantacao' | 'sem_plano'

function calcStatusFinanceiro(fin: InfoFinanceira | null, hoje: string): StatusFinanceiro {
  if (!fin) return 'sem_plano'
  const sc = fin.status_comercial
  if (sc === 'em_implantacao') return 'implantacao'
  if (sc === 'trial') return 'trial'
  if (sc === 'cortesia') return 'cortesia'
  if (sc === 'cancelado') return 'cancelada'
  if (sc === 'suspenso' || sc === 'vencido') return 'atrasada'
  if (sc === 'pagante') {
    if (fin.prazo_acesso && fin.prazo_acesso < hoje) return 'atrasada'
    if (fin.liberacao_status === 'cancelado') return 'cancelada'
    if (fin.liberacao_status === 'pendente' && !fin.prazo_acesso) return 'pendente'
    return 'em_dia'
  }
  if (fin.prazo_acesso && fin.prazo_acesso < hoje) return 'atrasada'
  if (fin.liberacao_status === 'cancelado') return 'cancelada'
  if (fin.liberacao_status === 'pendente' && !fin.prazo_acesso) return 'pendente'
  return 'em_dia'
}

function diasAtraso(prazo: string | null, hoje: string): number {
  if (!prazo || prazo >= hoje) return 0
  return Math.floor((new Date(hoje).getTime() - new Date(prazo).getTime()) / 86400000)
}

function fmtData(d: string | null) {
  if (!d) return '—'
  const [ano, mes, dia] = d.split('-')
  return `${dia}/${mes}/${ano}`
}

const FIN_STATUS_CONFIG: Record<StatusFinanceiro, { label: string; cls: string }> = {
  em_dia:      { label: 'Pagante',       cls: 'bg-green-100 text-green-700' },
  atrasada:    { label: 'Vencido',       cls: 'bg-red-100 text-red-700' },
  trial:       { label: 'Trial',         cls: 'bg-blue-100 text-blue-700' },
  cortesia:    { label: 'Cortesia',      cls: 'bg-purple-100 text-purple-700' },
  cancelada:   { label: 'Cancelado',     cls: 'bg-zinc-200 text-zinc-500 line-through' },
  pendente:    { label: 'Pendente',      cls: 'bg-amber-100 text-amber-700' },
  implantacao: { label: 'Implantação',   cls: 'bg-orange-100 text-orange-700' },
  sem_plano:   { label: 'Sem plano',     cls: 'bg-zinc-100 text-zinc-400' },
}

function BadgeFinanceiro({ statusFin }: { statusFin: StatusFinanceiro }) {
  const c = FIN_STATUS_CONFIG[statusFin]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}

type Filtro = 'todos' | 'atrasadas' | 'trial' | 'sem_meta' | 'critico' | 'em_dia' | 'implantacao'
const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos',       label: 'Todas' },
  { key: 'em_dia',      label: 'Pagante' },
  { key: 'implantacao', label: 'Implantação' },
  { key: 'trial',       label: 'Trial' },
  { key: 'atrasadas',   label: 'Vencidas' },
  { key: 'sem_meta',    label: 'Sem meta' },
  { key: 'critico',     label: 'Crítico' },
]

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtR(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

// ── Modal de configuração de meta ────────────────────────────────────────────

interface MetaModalProps {
  loja: LojaAdocao
  onClose: () => void
  onSaved: () => void
}

function MetaModal({ loja, onClose, onSaved }: MetaModalProps) {
  const m = loja.meta
  const [vendas, setVendas] = useState(String(m?.vendas_mes_estimadas ?? ''))
  const [pct, setPct] = useState(String(m?.percentual_recorrente_estimado ?? ''))
  const [meta, setMeta] = useState(String(m?.meta_recorrentes_mes ?? ''))
  const [ticket, setTicket] = useState(String(m?.ticket_medio_estimado ?? ''))
  const [respNome, setRespNome] = useState(m?.responsavel_loja_nome ?? '')
  const [respWa, setRespWa] = useState(m?.responsavel_loja_whatsapp ?? '')
  const [origem, setOrigem] = useState(m?.origem_meta ?? 'manual')
  const [dataInicio, setDataInicio] = useState(m?.data_inicio_acompanhamento ?? '')
  const [obs, setObs] = useState(m?.observacoes ?? '')
  const [status, setStatus] = useState(m?.status ?? 'ativo')
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()

  const sugestao = useMemo(() => {
    const v = Number(vendas)
    const p = Number(pct)
    if (v > 0 && p > 0) return Math.round(v * p / 100)
    return null
  }, [vendas, pct])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const input: MetaAdocaoInput = {
      loja_id: loja.id,
      vendas_mes_estimadas: vendas ? Number(vendas) : null,
      percentual_recorrente_estimado: pct ? Number(pct) : null,
      meta_recorrentes_mes: meta ? Number(meta) : null,
      ticket_medio_estimado: ticket ? Number(ticket) : null,
      responsavel_loja_nome: respNome,
      responsavel_loja_whatsapp: respWa,
      origem_meta: origem,
      data_inicio_acompanhamento: dataInicio || null,
      observacoes: obs,
      status,
    }
    startTransition(async () => {
      const res = await salvarMetaAdocao(input)
      if (!res.ok) { setErro(res.erro ?? 'Erro ao salvar'); return }
      onSaved()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900">Configurar meta</h2>
            <p className="text-sm text-zinc-500">{loja.nome}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Vendas/mês estimadas</span>
              <input type="number" min="0" value={vendas} onChange={e => setVendas(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 1000" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">% recorrente estimado</span>
              <input type="number" min="0" max="100" step="0.1" value={pct} onChange={e => setPct(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 60" />
            </label>
          </div>

          {sugestao !== null && (
            <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-green-700 flex items-center justify-between">
              <span>Sugestão calculada: <strong>{fmt(sugestao)} cadastros/mês</strong></span>
              <button type="button" onClick={() => setMeta(String(sugestao))}
                className="text-xs underline text-green-600">Usar</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Meta recorrentes/mês <span className="text-zinc-400">(final)</span></span>
              <input type="number" min="0" value={meta} onChange={e => setMeta(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm font-semibold" placeholder="ex: 600" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Ticket médio estimado (R$)</span>
              <input type="number" min="0" step="0.01" value={ticket} onChange={e => setTicket(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="ex: 120.00" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Responsável da loja</span>
              <input type="text" value={respNome} onChange={e => setRespNome(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="Nome" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">WhatsApp</span>
              <input type="text" value={respWa} onChange={e => setRespWa(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" placeholder="55 48 99999-9999" />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Origem</span>
              <select value={origem} onChange={e => setOrigem(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm">
                <option value="manual">Manual</option>
                <option value="conversa_whatsapp">WhatsApp</option>
                <option value="landing_page">Landing page</option>
                <option value="onboarding">Onboarding</option>
                <option value="importacao">Importação</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Início acompanhamento</span>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-600">Status</span>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm">
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="sem_meta">Sem meta</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-600">Observações</span>
            <textarea rows={2} value={obs} onChange={e => setObs(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Notas internas..." />
          </label>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : 'Salvar meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Painel de detalhes da loja ────────────────────────────────────────────────

function LojaDrilldown({ loja, hoje, metaDiaria, esperado, gap }: {
  loja: LojaAdocao
  hoje: string
  metaDiaria: number | null
  esperado: number
  gap: number
}) {
  const m = loja.metricas
  const mediaAtual = diaAtual(hoje) > 1
    ? Math.round(m.cadastradas_mes / (diaAtual(hoje) - 1))
    : m.cadastradas_hoje

  const responsavel = loja.meta?.responsavel_loja_nome ?? loja.empresa_nome ?? loja.nome
  const metaDiariaText = metaDiaria ? `${fmt(metaDiaria)} vendas recorrentes por dia` : 'sem meta configurada'
  const mediaText = `${fmt(mediaAtual)} por dia`

  const mensagemCobranca = `${responsavel}, estou olhando aqui o F5 da sua loja. Pelo combinado, vocês deveriam cadastrar cerca de ${metaDiariaText}. Hoje vocês estão cadastrando em média ${mediaText}. Antes de avaliar resultado, precisamos alimentar o sistema com as vendas recorrentes que já acontecem no balcão.`

  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-zinc-700">{loja.nome}</span>
        <span className="text-xs text-zinc-400">{loja.empresa_nome}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-white rounded-lg p-3 border border-zinc-100">
          <div className="text-zinc-500 text-xs mb-1">Meta mensal</div>
          <div className="font-semibold text-zinc-900">{loja.meta?.meta_recorrentes_mes ? fmt(loja.meta.meta_recorrentes_mes) : '—'}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-zinc-100">
          <div className="text-zinc-500 text-xs mb-1">Esperado até hoje</div>
          <div className="font-semibold text-zinc-900">{esperado > 0 ? fmt(esperado) : '—'}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-zinc-100">
          <div className="text-zinc-500 text-xs mb-1">Gap</div>
          <div className={`font-semibold ${gap < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {esperado > 0 ? (gap >= 0 ? `+${fmt(gap)}` : fmt(gap)) : '—'}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-zinc-100">
          <div className="text-zinc-500 text-xs mb-1">Média diária atual</div>
          <div className="font-semibold text-zinc-900">{fmt(mediaAtual)}/dia</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Mensagem pronta</span>
          <button
            onClick={() => navigator.clipboard.writeText(mensagemCobranca)}
            className="text-xs text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded px-2 py-0.5">
            Copiar
          </button>
        </div>
        <p className="text-sm text-zinc-700 leading-relaxed">{mensagemCobranca}</p>
      </div>
    </div>
  )
}

// ── Tabela principal ──────────────────────────────────────────────────────────

interface Props {
  lojas: LojaAdocao[]
  hoje: string
}

// th classes compartilhados
const TH = 'px-3 py-2.5 font-medium text-zinc-500 text-xs whitespace-nowrap'
const TH_R = `${TH} text-right`
const TD = 'px-3 py-3 text-sm whitespace-nowrap'
const TD_R = `${TD} text-right tabular-nums`

export function AdocaoClient({ lojas, hoje }: Props) {
  const [editando, setEditando] = useState<LojaAdocao | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const totalLojas = lojas.length
  const comMeta = lojas.filter(l => l.meta?.meta_recorrentes_mes).length

  const linhas = useMemo(() => {
    const totalDias = diasNoMes(hoje)
    const diaHoje = diaAtual(hoje)

    return lojas.map(l => {
      const metaMes = l.meta?.meta_recorrentes_mes ?? null
      const metaDiaria = metaMes ? Math.round(metaMes / totalDias) : null
      const esperado = metaDiaria ? Math.min(Math.round(metaDiaria * diaHoje), metaMes!) : 0
      const gap = esperado > 0 ? l.metricas.cadastradas_mes - esperado : 0
      const statusKey = calcularStatus(l.metricas.cadastradas_mes, esperado, !!metaMes)
      const statusFin = calcStatusFinanceiro(l.financeiro, hoje)
      const atraso = diasAtraso(l.financeiro?.prazo_acesso ?? null, hoje)
      return { loja: l, metaDiaria, esperado, gap, statusKey, statusFin, atraso }
    })
  }, [lojas, hoje])

  const linhasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return linhas.filter(({ loja, statusFin, statusKey }) => {
      // filtro de status
      if (filtro !== 'todos') {
        if (filtro === 'atrasadas'   && statusFin !== 'atrasada')    return false
        if (filtro === 'trial'       && statusFin !== 'trial')       return false
        if (filtro === 'em_dia'      && statusFin !== 'em_dia')      return false
        if (filtro === 'implantacao' && statusFin !== 'implantacao') return false
        if (filtro === 'sem_meta'    && statusKey !== 'sem_meta')    return false
        if (filtro === 'critico'     && statusKey !== 'critico')     return false
      }
      // busca textual
      if (termo) {
        const haystack = [
          loja.nome,
          loja.empresa_nome,
          loja.whatsapp ?? '',
          loja.documento ?? '',
          loja.email ?? '',
          loja.empresa_responsavel_email ?? '',
          ...loja.emails_membros,
          loja.meta?.responsavel_loja_nome ?? '',
          loja.meta?.responsavel_loja_whatsapp ?? '',
        ].join(' ').toLowerCase()
        if (!haystack.includes(termo)) return false
      }
      return true
    })
  }, [linhas, filtro, busca])

  const expandidoData = useMemo(
    () => expandido ? linhasFiltradas.find(r => r.loja.id === expandido) ?? null : null,
    [expandido, linhasFiltradas],
  )

  return (
    <div className="space-y-3">
      {/* Resumo + busca + filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm text-zinc-600">
          <span><strong className="text-zinc-900">{totalLojas}</strong> lojas</span>
          <span><strong className="text-zinc-900">{comMeta}</strong> com meta</span>
          <span><strong className="text-zinc-900">{linhasFiltradas.length}</strong> exibidas</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* campo de busca */}
          <input
            type="search"
            placeholder="Buscar loja, responsável, WhatsApp, CNPJ…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="h-8 w-full min-w-[360px] max-w-[480px] rounded-lg border border-zinc-200 bg-white px-3 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
          {/* filtros rápidos */}
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtro === f.key
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela com scroll horizontal */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            {/* Linha de grupos */}
            <tr className="bg-zinc-50 border-b border-zinc-200 text-left">
              <th colSpan={2} className={`${TH} sticky left-0 z-20 bg-zinc-50 border-r border-zinc-200`}>
                Loja
              </th>
              <th colSpan={3} className={`${TH} border-l border-zinc-200 text-zinc-400`}>
                Adoção
              </th>
              <th colSpan={7} className={`${TH} border-l border-zinc-200 text-zinc-400`}>
                Operação
              </th>
              <th colSpan={2} className={`${TH} border-l border-zinc-200 text-zinc-400`}>
                Resultado
              </th>
              <th colSpan={5} className={`${TH} border-l border-zinc-200 text-zinc-400`}>
                Financeiro
              </th>
            </tr>
            {/* Linha de colunas */}
            <tr className="border-b border-zinc-100 text-left">
              <th className={`${TH} sticky left-0 z-20 bg-white border-r border-zinc-100 min-w-[200px]`}>Loja</th>
              <th className={`${TH} min-w-[130px]`}>Responsável</th>
              <th className={`${TH_R} min-w-[80px]`}>Meta/mês</th>
              <th className={`${TH_R} min-w-[70px]`}>Meta/dia</th>
              <th className={`${TH} min-w-[90px]`}>Status</th>
              <th className={`${TH_R} border-l border-zinc-100 min-w-[60px]`}>Hoje</th>
              <th className={`${TH_R} min-w-[70px]`}>No mês</th>
              <th className={`${TH_R} min-w-[70px]`}>Esperado</th>
              <th className={`${TH_R} min-w-[70px]`}>Gap</th>
              <th className={`${TH_R} min-w-[60px]`}>Oport.</th>
              <th className={`${TH_R} min-w-[70px]`}>Pendentes</th>
              <th className={`${TH_R} min-w-[70px]`}>Atrasados</th>
              <th className={`${TH_R} border-l border-zinc-100 min-w-[110px]`}>Recuperado</th>
              <th className={`${TH_R} min-w-[60px]`}>Perdas</th>
              <th className={`${TH} border-l border-zinc-100 min-w-[110px]`}>Plano</th>
              <th className={`${TH_R} min-w-[100px]`}>Mensalidade</th>
              <th className={`${TH} min-w-[90px]`}>Situação</th>
              <th className={`${TH} min-w-[90px]`}>Vencimento</th>
              <th className={`${TH_R} min-w-[60px]`}>Atraso</th>
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map(({ loja, metaDiaria, esperado, gap, statusKey, statusFin, atraso }) => {
              const isExpanded = expandido === loja.id
              const rowAlert = statusKey === 'critico' || statusFin === 'atrasada'
              return (
                <tr
                  key={loja.id}
                  className={`border-b border-zinc-50 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-zinc-50' :
                    rowAlert ? 'hover:bg-red-50/40 bg-red-50/20' : 'hover:bg-zinc-50/60'
                  }`}
                  onClick={() => setExpandido(isExpanded ? null : loja.id)}
                >
                  {/* Loja — sticky + botão configurar */}
                  <td className={`${TD} sticky left-0 z-10 border-r border-zinc-100 font-medium text-zinc-900 min-w-[200px] ${
                    isExpanded ? 'bg-zinc-50' : rowAlert ? 'bg-red-50/20' : 'bg-white'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate max-w-[145px]">{loja.nome}</div>
                        <div className="text-xs text-zinc-400 truncate max-w-[145px]">{loja.empresa_nome}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setEditando(loja) }}
                        className="shrink-0 text-[10px] text-zinc-400 hover:text-zinc-900 border border-zinc-200 rounded px-1.5 py-0.5 whitespace-nowrap mt-0.5 hover:bg-zinc-50"
                      >
                        {loja.meta ? 'Editar' : 'Config.'}
                      </button>
                    </div>
                  </td>

                  {/* Responsável */}
                  <td className={`${TD} min-w-[130px]`}>
                    {loja.meta?.responsavel_loja_nome
                      ? <span className="text-zinc-600 max-w-[160px] truncate block">{loja.meta.responsavel_loja_nome}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>

                  {/* Adoção: meta/mês, meta/dia, status */}
                  <td className={TD_R}>
                    {loja.meta?.meta_recorrentes_mes
                      ? <span className="text-zinc-700">{fmt(loja.meta.meta_recorrentes_mes)}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={TD_R}>
                    {metaDiaria
                      ? <span className="text-zinc-700">{fmt(metaDiaria)}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={TD}><Badge status={statusKey} /></td>

                  {/* Operação */}
                  <td className={`${TD_R} border-l border-zinc-50`}>
                    <span className={loja.metricas.cadastradas_hoje > 0 ? 'text-green-600 font-medium' : 'text-zinc-400'}>
                      {fmt(loja.metricas.cadastradas_hoje)}
                    </span>
                  </td>
                  <td className={`${TD_R} font-medium text-zinc-900`}>
                    {fmt(loja.metricas.cadastradas_mes)}
                  </td>
                  <td className={TD_R}>
                    {esperado > 0
                      ? <span className="text-zinc-600">{fmt(esperado)}</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={`${TD_R} font-medium`}>
                    {esperado > 0 ? (
                      <span className={gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {gap >= 0 ? `+${fmt(gap)}` : fmt(gap)}
                      </span>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={TD_R}><span className="text-zinc-700">{fmt(loja.metricas.oportunidades_abertas)}</span></td>
                  <td className={TD_R}><span className="text-zinc-700">{fmt(loja.metricas.avisos_pendentes)}</span></td>
                  <td className={TD_R}>
                    <span className={loja.metricas.avisos_atrasados > 0 ? 'text-red-600 font-medium' : 'text-zinc-400'}>
                      {fmt(loja.metricas.avisos_atrasados)}
                    </span>
                  </td>

                  {/* Resultado */}
                  <td className={`${TD_R} border-l border-zinc-50`}>
                    <div className="text-zinc-700">{fmtR(loja.metricas.recompras_valor)}</div>
                    <div className="text-[10px] text-zinc-400">{loja.metricas.recompras_qtd} recomp.</div>
                  </td>
                  <td className={TD_R}>
                    <span className={loja.metricas.perdas_qtd > 0 ? 'text-red-500' : 'text-zinc-400'}>
                      {fmt(loja.metricas.perdas_qtd)}
                    </span>
                  </td>

                  {/* Financeiro */}
                  <td className={`${TD} border-l border-zinc-100 text-zinc-700 text-xs`}>
                    {loja.financeiro?.plano_nome ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={`${TD_R} text-zinc-700 text-xs`}>
                    {loja.financeiro?.valor_pago
                      ? `R$${loja.financeiro.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}/mês`
                      : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={TD}><BadgeFinanceiro statusFin={statusFin} /></td>
                  <td className={`${TD} text-xs`}>
                    {statusFin === 'trial' && loja.financeiro?.trial_ends_at
                      ? <span className="text-blue-600">até {fmtData(loja.financeiro.trial_ends_at.slice(0, 10))}</span>
                      : loja.financeiro?.prazo_acesso
                        ? <span className={statusFin === 'atrasada' ? 'text-red-600 font-medium' : 'text-zinc-600'}>
                            {fmtData(loja.financeiro.prazo_acesso)}
                          </span>
                        : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className={`${TD_R} text-xs`}>
                    {atraso > 0
                      ? <span className="text-red-600 font-medium">{atraso}d</span>
                      : <span className="text-zinc-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {linhasFiltradas.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-zinc-400">
            {lojas.length === 0 ? 'Nenhuma loja ativa encontrada.' : 'Nenhuma loja corresponde ao filtro selecionado.'}
          </div>
        )}
      </div>

      {/* Painel de detalhes — fora do scroll para não cortar */}
      {expandidoData && (
        <LojaDrilldown
          loja={expandidoData.loja}
          hoje={hoje}
          metaDiaria={expandidoData.metaDiaria}
          esperado={expandidoData.esperado}
          gap={expandidoData.gap}
        />
      )}

      {editando && (
        <MetaModal
          loja={editando}
          onClose={() => setEditando(null)}
          onSaved={() => setEditando(null)}
        />
      )}
    </div>
  )
}
