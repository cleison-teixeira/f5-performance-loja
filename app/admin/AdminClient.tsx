'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { LiberacaoRow, LojaSimples, AdminStats } from './page'
import type { UsuarioResult } from './actions'
import { liberarAcesso, cancelarLiberacao, buscarUsuarioPorEmail, vincularUsuario } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Msg = { tipo: 'ok' | 'erro'; texto: string } | null

type LiberarForm = {
  email: string
  loja_nome: string
  loja_whatsapp: string
  valor_mensal: string
  status: string
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

const VAZIO: LiberarForm = {
  email: '', loja_nome: '', loja_whatsapp: '',
  valor_mensal: '149,00', status: 'ativo', observacao: '',
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
    vinculado: 'bg-green-100 text-green-700',
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

  // Busca global
  const [busca, setBusca] = useState('')

  // Liberar form
  const [form, setForm] = useState<LiberarForm>(VAZIO)
  const [resultado, setResultado] = useState<{ resultado: 'vinculado' | 'pendente'; loja: string } | null>(null)

  // Consultar / Anexar
  const [consultarAberto, setConsultarAberto] = useState(false)
  const [emailConsulta, setEmailConsulta] = useState('')
  const [usuarioConsulta, setUsuarioConsulta] = useState<UsuarioResult | null>(null)
  const [consultaErro, setConsultaErro] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [anexarLojaId, setAnexarLojaId] = useState('')

  function showMsg(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 6000)
  }

  function setF(field: keyof LiberarForm, v: string) {
    setForm(prev => ({ ...prev, [field]: v }))
  }

  // Licenças filtradas pela busca
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

  // ── Liberar ───────────────────────────────────────────────────────────────

  function submitLiberar() {
    if (!form.email.trim()) return showMsg('erro', 'E-mail da compra obrigatório.')
    if (!form.loja_nome.trim()) return showMsg('erro', 'Nome da loja obrigatório.')

    setResultado(null)
    startTransition(async () => {
      const res = await liberarAcesso({
        empresa_nome: form.loja_nome,
        empresa_existente_id: '',
        responsavel_nome: '',
        responsavel_email: form.email,
        responsavel_whatsapp: '',
        nicho: '',
        plano_id: '',
        status: STATUS_EMPRESA[form.status] ?? 'em_onboarding',
        billing_status: form.status,
        loja_nome: form.loja_nome,
        loja_whatsapp: form.loja_whatsapp,
        cidade: '',
        prazo_acesso: form.status === 'trial' ? trialAte() : '',
        valor_pago: form.valor_mensal,
        origem: '',
        observacao: form.observacao,
        comprovante_url: '',
      })
      if (res.ok) {
        setResultado({ resultado: res.resultado!, loja: form.loja_nome })
        setForm(VAZIO)
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao liberar.')
      }
    })
  }

  // ── Consultar / Anexar ────────────────────────────────────────────────────

  async function handleBuscar() {
    if (!emailConsulta.trim()) return
    setBuscando(true)
    setConsultaErro(null)
    setUsuarioConsulta(null)
    setAnexarLojaId('')
    const res = await buscarUsuarioPorEmail(emailConsulta)
    setBuscando(false)
    if (res.ok && res.usuario) setUsuarioConsulta(res.usuario)
    else setConsultaErro(res.erro ?? 'Usuário não encontrado.')
  }

  function submitAnexar() {
    if (!usuarioConsulta || !anexarLojaId) return
    startTransition(async () => {
      const res = await vincularUsuario({ perfil_id: usuarioConsulta.id, loja_id: anexarLojaId, role: 'dono' })
      if (res.ok) {
        showMsg('ok', 'Loja anexada com sucesso.')
        setAnexarLojaId('')
        const refresh = await buscarUsuarioPorEmail(emailConsulta)
        if (refresh.ok && refresh.usuario) setUsuarioConsulta(refresh.usuario)
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao anexar.')
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

        {/* Global message */}
        {msg && (
          <div className={`rounded-md px-4 py-3 text-sm border ${
            msg.tipo === 'ok' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {msg.texto}
          </div>
        )}

        {/* ── Formulário: Liberar Licença ── */}
        <div className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Liberar licença de loja</h2>
            <p className="text-xs text-zinc-400 mt-0.5">R$149/mês por loja ativa</p>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-md border p-3 text-sm ${
              resultado.resultado === 'vinculado'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-yellow-50 border-yellow-200 text-yellow-800'
            }`}>
              {resultado.resultado === 'vinculado' ? (
                <><strong>{resultado.loja}</strong> — acesso liberado. O cliente pode logar agora.</>
              ) : (
                <><strong>{resultado.loja}</strong> — pendente. O acesso será ativado quando o cliente criar a conta.</>
              )}
              <button onClick={() => setResultado(null)} className="ml-3 text-xs underline opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="E-mail da compra *">
                <Inp value={form.email} onChange={v => setF('email', v)} type="email" placeholder="cliente@email.com" />
              </Field>
            </div>

            <Field label="Nome da loja *">
              <Inp value={form.loja_nome} onChange={v => setF('loja_nome', v)} placeholder="Ex: Cia Cidade Azul Angeloni" />
            </Field>

            <Field label="WhatsApp da loja">
              <Inp
                value={form.loja_whatsapp}
                onChange={v => setF('loja_whatsapp', maskWhatsApp(v))}
                type="tel"
                placeholder="(48) 99999-9999"
              />
            </Field>

            <Field label="Valor mensal (R$)">
              <Inp value={form.valor_mensal} onChange={v => setF('valor_mensal', v)} placeholder="149,00" />
            </Field>

            <Field label="Status">
              <select value={form.status} onChange={e => setF('status', e.target.value)}
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                {STATUS_OPCOES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          </div>

          {form.status === 'trial' && (
            <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
              Trial automático: acesso válido por 7 dias a partir da liberação (até {trialAte()}).
            </p>
          )}

          <Field label="Observação interna">
            <textarea value={form.observacao} onChange={e => setF('observacao', e.target.value)}
              rows={2}
              className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none" />
          </Field>

          <button
            onClick={submitLiberar}
            disabled={pending || !form.email.trim() || !form.loja_nome.trim()}
            className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
          >
            {pending ? 'Liberando...' : 'Liberar acesso'}
          </button>
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

        {/* ── Consultar / Anexar Loja ── */}
        <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
          <button
            onClick={() => setConsultarAberto(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-800">Consultar / Anexar loja</p>
              <p className="text-xs text-zinc-400 mt-0.5">Busque um cliente por e-mail e vincule lojas adicionais</p>
            </div>
            <span className="text-zinc-400 text-lg leading-none">{consultarAberto ? '−' : '+'}</span>
          </button>

          {consultarAberto && (
            <div className="border-t border-zinc-100 px-5 py-4 space-y-4">

              {/* Busca */}
              <div className="flex gap-2">
                <input type="email" value={emailConsulta} onChange={e => setEmailConsulta(e.target.value)}
                  placeholder="cliente@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  className="flex-1 border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                <button onClick={handleBuscar} disabled={buscando || !emailConsulta.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors">
                  {buscando ? '...' : 'Buscar'}
                </button>
              </div>

              {consultaErro && (
                <p className="text-sm text-red-600">{consultaErro}</p>
              )}

              {/* Resultado da consulta */}
              {usuarioConsulta && (
                <div className="space-y-3">
                  <div className="rounded-md bg-zinc-50 border border-zinc-200 px-4 py-3">
                    <p className="text-sm font-medium text-zinc-800">{usuarioConsulta.nome ?? '(sem nome)'}</p>
                    <p className="text-xs text-zinc-500">{usuarioConsulta.email}</p>
                  </div>

                  {/* Lojas atuais */}
                  {usuarioConsulta.vinculos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400 mb-2">Lojas vinculadas</p>
                      <div className="space-y-1">
                        {usuarioConsulta.vinculos.map(v => (
                          <div key={v.membro_id} className="flex items-center justify-between text-sm border border-zinc-100 rounded px-3 py-1.5">
                            <span className="text-zinc-700 truncate">{v.loja_nome}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${v.ativo ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-400'}`}>
                              {v.ativo ? 'ativo' : 'inativo'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anexar loja */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400">Anexar loja existente</p>
                    <div className="flex gap-2">
                      <select value={anexarLojaId} onChange={e => setAnexarLojaId(e.target.value)}
                        className="flex-1 border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                        <option value="">Selecionar loja...</option>
                        {todasLojas.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.empresa_nome ? `${l.empresa_nome} — ` : ''}{l.nome}
                          </option>
                        ))}
                      </select>
                      <button onClick={submitAnexar} disabled={pending || !anexarLojaId}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors whitespace-nowrap">
                        {pending ? '...' : 'Anexar'}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">
                      A loja precisa já existir no sistema. Use o formulário acima para criar novas lojas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
