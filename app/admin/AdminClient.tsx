'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { LiberacaoRow, LojaSimples, AdminStats } from './page'
import { liberarAcesso, cancelarLiberacao, liberarRede } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Msg = { tipo: 'ok' | 'erro'; texto: string } | null
type Aba = 'loja' | 'rede'

type LojaForm = {
  email: string
  loja_nome: string
  loja_whatsapp: string
  valor_mensal: string
  status: string
  observacao: string
}

type RedeForm = {
  email: string
  rede_nome: string
  whatsapp: string
  observacao: string
}

const STATUS_OPCOES = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'trial', label: 'Trial (7 dias automático)' },
  { value: 'cortesia', label: 'Cortesia' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_EMPRESA: Record<string, string> = {
  trial: 'trial', ativo: 'ativa', cortesia: 'ativa', suspenso: 'inativa', cancelado: 'inativa',
}

const VAZIO_LOJA: LojaForm = {
  email: '', loja_nome: '', loja_whatsapp: '',
  valor_mensal: '149,00', status: 'ativo', observacao: '',
}

const VAZIO_REDE: RedeForm = {
  email: '', rede_nome: '', whatsapp: '', observacao: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Inp({ value, onChange, type = 'text', placeholder = '', disabled = false }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; disabled?: boolean
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400" />
  )
}

function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-700',
    aplicado: 'bg-green-100 text-green-700',
    ativo: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    cortesia: 'bg-purple-100 text-purple-700',
    suspenso: 'bg-red-100 text-red-700',
    cancelado: 'bg-zinc-100 text-zinc-500',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? 'bg-zinc-100 text-zinc-600'}`}>
      {value}
    </span>
  )
}

function trialAte(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatBRL(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR')
}

function maskWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminClient({
  liberacoes, stats, todasLojas,
}: {
  liberacoes: LiberacaoRow[]
  stats: AdminStats
  todasLojas: LojaSimples[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<Msg>(null)

  // Aba ativa
  const [aba, setAba] = useState<Aba>('loja')

  // Busca global
  const [busca, setBusca] = useState('')

  // Formulário Loja
  const [lojaForm, setLojaForm] = useState<LojaForm>(VAZIO_LOJA)
  const [resultadoLoja, setResultadoLoja] = useState<{ resultado: 'vinculado' | 'pendente'; nome: string } | null>(null)

  // Formulário Rede
  const [redeForm, setRedeForm] = useState<RedeForm>(VAZIO_REDE)
  const [lojasRede, setLojasRede] = useState<LojaSimples[]>([])
  const [buscaLoja, setBuscaLoja] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [resultadoRede, setResultadoRede] = useState<{ resultado: 'vinculado' | 'pendente'; count: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function showMsg(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 6000)
  }

  // Filtro da lista de licenças
  const liberacoesFiltradas = busca.trim()
    ? liberacoes.filter(l => {
        const q = busca.toLowerCase()
        return (
          l.email.toLowerCase().includes(q) ||
          (l.loja_nome ?? '').toLowerCase().includes(q) ||
          (l.loja_whatsapp ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
        )
      })
    : liberacoes

  // Lojas disponíveis para Rede (excluindo já selecionadas)
  const lojasFiltradas = todasLojas.filter(l => {
    if (lojasRede.some(s => s.id === l.id)) return false
    if (buscaLoja === '') return true
    const q = buscaLoja.toLowerCase()
    const qDigits = buscaLoja.replace(/\D/g, '')
    return (
      l.nome.toLowerCase().includes(q) ||
      l.empresa_nome.toLowerCase().includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (qDigits.length >= 4 && (l.whatsapp ?? '').replace(/\D/g, '').includes(qDigits))
    )
  })

  // ── Liberar Loja ─────────────────────────────────────────────────────────

  function submitLoja() {
    if (!lojaForm.email.trim()) return showMsg('erro', 'E-mail da compra obrigatório.')
    if (!lojaForm.loja_nome.trim()) return showMsg('erro', 'Nome da loja obrigatório.')

    setResultadoLoja(null)
    startTransition(async () => {
      const res = await liberarAcesso({
        empresa_nome: lojaForm.loja_nome,
        empresa_existente_id: '',
        responsavel_nome: '',
        responsavel_email: lojaForm.email,
        responsavel_whatsapp: '',
        nicho: '',
        plano_id: '',
        status: STATUS_EMPRESA[lojaForm.status] ?? 'em_onboarding',
        billing_status: lojaForm.status,
        loja_nome: lojaForm.loja_nome,
        loja_whatsapp: lojaForm.loja_whatsapp,
        cidade: '',
        prazo_acesso: lojaForm.status === 'trial' ? trialAte() : '',
        valor_pago: lojaForm.valor_mensal,
        origem: '',
        observacao: lojaForm.observacao,
        comprovante_url: '',
      })
      if (res.ok) {
        setResultadoLoja({ resultado: res.resultado!, nome: lojaForm.loja_nome })
        setLojaForm(VAZIO_LOJA)
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao liberar.')
      }
    })
  }

  // ── Liberar Rede ─────────────────────────────────────────────────────────

  function adicionarLojaRede(loja: LojaSimples) {
    setLojasRede(prev => [...prev, loja])
    setBuscaLoja('')
    setShowDropdown(false)
  }

  function removerLojaRede(id: string) {
    setLojasRede(prev => prev.filter(l => l.id !== id))
  }

  function submitRede() {
    if (!redeForm.email.trim()) return showMsg('erro', 'E-mail do dono obrigatório.')
    if (!redeForm.rede_nome.trim()) return showMsg('erro', 'Nome da rede obrigatório.')
    if (lojasRede.length === 0) return showMsg('erro', 'Selecione ao menos uma loja.')

    setResultadoRede(null)
    startTransition(async () => {
      const res = await liberarRede({
        email: redeForm.email,
        rede_nome: redeForm.rede_nome,
        whatsapp: redeForm.whatsapp,
        observacao: redeForm.observacao,
        loja_ids: lojasRede.map(l => l.id),
      })
      if (res.ok) {
        setResultadoRede({ resultado: res.resultado!, count: res.lojas_processadas ?? lojasRede.length })
        setRedeForm(VAZIO_REDE)
        setLojasRede([])
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao liberar.')
      }
    })
  }

  function handleCancelar(id: string) {
    startTransition(async () => {
      const res = await cancelarLiberacao(id)
      if (res.ok) { showMsg('ok', 'Liberação cancelada.'); router.refresh() }
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-100">

      {/* Header */}
      <header className="bg-zinc-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Admin F5</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Gestão de licenças</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">
              App →
            </a>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-zinc-400 hover:text-white transition-colors">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

        {/* Busca global */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por loja, e-mail ou WhatsApp..."
            className="w-full border border-zinc-200 rounded-lg pl-10 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-sm"
          />
          {busca && (
            <button onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-lg leading-none">
              ×
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-zinc-200 px-4 py-3">
            <p className="text-xl font-bold text-zinc-900">{stats.total_lojas}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Lojas ativas</p>
          </div>
          <div className="bg-white rounded-lg border border-zinc-200 px-4 py-3">
            <p className="text-xl font-bold text-zinc-900">{stats.total_pendentes}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Acessos pendentes</p>
          </div>
          <div className="bg-white rounded-lg border border-green-200 px-4 py-3">
            <p className="text-xl font-bold text-green-700">{formatBRL(stats.receita_estimada)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Receita estimada/mês</p>
          </div>
        </div>

        {/* Mensagem global */}
        {msg && (
          <div className={`rounded-md px-4 py-3 text-sm border ${
            msg.tipo === 'ok' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {msg.texto}
          </div>
        )}

        {/* ── Painel principal ── */}
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">

          {/* Pills / menu */}
          <div className="px-5 pt-4 pb-0">
            <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
              <button
                onClick={() => { setAba('loja'); setResultadoRede(null) }}
                className={`text-sm font-medium py-1.5 px-5 rounded-md transition-colors ${
                  aba === 'loja' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Liberar Loja
              </button>
              <button
                onClick={() => { setAba('rede'); setResultadoLoja(null) }}
                className={`text-sm font-medium py-1.5 px-5 rounded-md transition-colors ${
                  aba === 'rede' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Liberar Rede
              </button>
            </div>
          </div>

          {/* ── Aba: Liberar Loja ── */}
          {aba === 'loja' && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-zinc-800">Liberar licença de loja</h2>
                <p className="text-xs text-zinc-400 mt-0.5">R$149/mês por loja ativa — gera nova licença faturável</p>
              </div>

              {resultadoLoja && (
                <div className={`rounded-md border p-3 text-sm ${
                  resultadoLoja.resultado === 'vinculado'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  {resultadoLoja.resultado === 'vinculado' ? (
                    <><strong>{resultadoLoja.nome}</strong> — acesso liberado. O cliente pode logar agora.</>
                  ) : (
                    <><strong>{resultadoLoja.nome}</strong> — pendente. O acesso será ativado quando o cliente criar a conta.</>
                  )}
                  <button onClick={() => setResultadoLoja(null)} className="ml-3 text-xs underline opacity-60 hover:opacity-100">×</button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="E-mail da compra *">
                    <Inp value={lojaForm.email} onChange={v => setLojaForm(p => ({ ...p, email: v }))} type="email" placeholder="cliente@email.com" />
                  </Field>
                </div>
                <Field label="Nome da loja *">
                  <Inp value={lojaForm.loja_nome} onChange={v => setLojaForm(p => ({ ...p, loja_nome: v }))} placeholder="Ex: Cia Cidade Azul Angeloni" />
                </Field>
                <Field label="WhatsApp da loja">
                  <Inp
                    value={lojaForm.loja_whatsapp}
                    onChange={v => setLojaForm(p => ({ ...p, loja_whatsapp: maskWhatsApp(v) }))}
                    type="tel"
                    placeholder="(48) 99999-9999"
                  />
                </Field>
                <Field label="Valor mensal (R$)">
                  <Inp value={lojaForm.valor_mensal} onChange={v => setLojaForm(p => ({ ...p, valor_mensal: v }))} placeholder="149,00" />
                </Field>
                <Field label="Status">
                  <select value={lojaForm.status} onChange={e => setLojaForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                    {STATUS_OPCOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>

              {lojaForm.status === 'trial' && (
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                  Trial automático: acesso válido por 7 dias a partir da liberação (até {trialAte()}).
                </p>
              )}

              <Field label="Observação interna">
                <textarea value={lojaForm.observacao} onChange={e => setLojaForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2}
                  className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none" />
              </Field>

              <button
                onClick={submitLoja}
                disabled={pending || !lojaForm.email.trim() || !lojaForm.loja_nome.trim()}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {pending ? 'Liberando...' : 'Liberar acesso'}
              </button>
            </div>
          )}

          {/* ── Aba: Liberar Rede ── */}
          {aba === 'rede' && (
            <div className="p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-zinc-800">Liberar acesso brinde ao dono multi-lojas</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Sem custo adicional — vincula o mesmo e-mail a várias lojas existentes</p>
              </div>

              {resultadoRede && (
                <div className={`rounded-md border p-3 text-sm ${
                  resultadoRede.resultado === 'vinculado'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  {resultadoRede.resultado === 'vinculado' ? (
                    <>Dono vinculado a <strong>{resultadoRede.count}</strong> loja{resultadoRede.count > 1 ? 's' : ''}. Pode logar agora e ver o seletor multi-loja.</>
                  ) : (
                    <><strong>{resultadoRede.count}</strong> pendência{resultadoRede.count > 1 ? 's' : ''} criada{resultadoRede.count > 1 ? 's' : ''}. O acesso será ativado quando o dono criar a conta.</>
                  )}
                  <button onClick={() => setResultadoRede(null)} className="ml-3 text-xs underline opacity-60 hover:opacity-100">×</button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label="E-mail do dono *">
                    <Inp value={redeForm.email} onChange={v => setRedeForm(p => ({ ...p, email: v }))} type="email" placeholder="dono@email.com" />
                  </Field>
                </div>
                <Field label="Nome da rede *">
                  <Inp value={redeForm.rede_nome} onChange={v => setRedeForm(p => ({ ...p, rede_nome: v }))} placeholder="Ex: Cia Cidade Azul" />
                </Field>
                <Field label="WhatsApp do dono">
                  <Inp
                    value={redeForm.whatsapp}
                    onChange={v => setRedeForm(p => ({ ...p, whatsapp: maskWhatsApp(v) }))}
                    type="tel"
                    placeholder="(48) 99999-9999"
                  />
                </Field>
              </div>

              {/* Seletor de lojas */}
              <Field label="Lojas da rede *">
                <div className="space-y-2">
                  {/* Chips de lojas selecionadas */}
                  {lojasRede.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lojasRede.map(l => (
                        <span key={l.id}
                          className="inline-flex items-center gap-1 bg-zinc-800 text-white text-xs px-2.5 py-1 rounded-full">
                          {l.nome}
                          <button
                            type="button"
                            onClick={() => removerLojaRede(l.id)}
                            className="opacity-60 hover:opacity-100 leading-none ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input de busca + dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <input
                      type="text"
                      value={buscaLoja}
                      onChange={e => { setBuscaLoja(e.target.value); setShowDropdown(true) }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Buscar loja por nome, e-mail ou WhatsApp..."
                      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                    {showDropdown && lojasFiltradas.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {lojasFiltradas.slice(0, 10).map(l => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => adicionarLojaRede(l)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors"
                          >
                            <div>
                              <span className="font-medium text-zinc-800">{l.nome}</span>
                              {l.empresa_nome && (
                                <span className="text-zinc-400 ml-1.5 text-xs">{l.empresa_nome}</span>
                              )}
                            </div>
                            {(l.email || l.whatsapp) && (
                              <div className="text-xs text-zinc-400 mt-0.5">
                                {l.email}{l.email && l.whatsapp ? ' · ' : ''}{l.whatsapp}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showDropdown && buscaLoja && lojasFiltradas.length === 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-sm px-3 py-2">
                        <p className="text-sm text-zinc-400">Nenhuma loja encontrada.</p>
                      </div>
                    )}
                  </div>

                  {lojasRede.length === 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-2.5 py-1.5">
                      Selecione pelo menos uma loja para liberar acesso rede. Clique no item da lista para adicioná-la.
                    </p>
                  )}
                </div>
              </Field>

              <Field label="Observação interna">
                <textarea value={redeForm.observacao} onChange={e => setRedeForm(p => ({ ...p, observacao: e.target.value }))}
                  rows={2}
                  className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none" />
              </Field>

              <button
                onClick={submitRede}
                disabled={pending || !redeForm.email.trim() || !redeForm.rede_nome.trim() || lojasRede.length === 0}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {pending ? 'Liberando...' : `Liberar acesso rede${lojasRede.length > 0 ? ` (${lojasRede.length} loja${lojasRede.length > 1 ? 's' : ''})` : ''}`}
              </button>
            </div>
          )}

        </div>

        {/* ── Licenças Recentes ── */}
        <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800">
              Licenças recentes
              {busca && liberacoesFiltradas.length !== liberacoes.length && (
                <span className="ml-2 text-xs font-normal text-zinc-400">
                  {liberacoesFiltradas.length} resultado{liberacoesFiltradas.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
            {stats.total_pendentes > 0 && !busca && (
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                {stats.total_pendentes} pendente{stats.total_pendentes > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {liberacoesFiltradas.length === 0 && (
            <p className="text-sm text-zinc-400">
              {busca ? 'Nenhum resultado para a busca.' : 'Nenhuma liberação registrada.'}
            </p>
          )}

          <div className="divide-y divide-zinc-100">
            {liberacoesFiltradas.map(l => (
              <div key={l.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-zinc-800 truncate">{l.email}</p>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 flex-wrap">
                    {l.loja_nome && <span className="font-medium text-zinc-600">{l.loja_nome}</span>}
                    {l.loja_nome && <span className="text-zinc-300">·</span>}
                    <span>{l.valor_pago ? `R$${l.valor_pago}/mês` : 'R$149/mês'}</span>
                    {l.prazo_acesso && (
                      <><span className="text-zinc-300">·</span><span>trial até {l.prazo_acesso}</span></>
                    )}
                    <span className="text-zinc-300">·</span>
                    <span>{formatDate(l.criado_em)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge value={l.status} />
                  {l.status === 'pendente' && (
                    <button onClick={() => handleCancelar(l.id)} disabled={pending}
                      className="text-xs text-zinc-400 hover:text-red-600 transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
