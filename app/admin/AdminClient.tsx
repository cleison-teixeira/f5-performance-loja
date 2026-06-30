'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EmpresaRow, PlanoOption, LojaRow, LiberacaoRow, AdminStats } from './page'
import type { UsuarioResult } from './actions'
import {
  liberarAcesso,
  criarEmpresa, atualizarEmpresa, criarLoja,
  buscarUsuarioPorEmail, vincularUsuario, alterarAcesso, cancelarLiberacao,
} from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Msg = { tipo: 'ok' | 'erro'; texto: string } | null
type Tab = 'liberar' | 'empresas' | 'acessos'

type LiberarForm = {
  empresa_nome: string; responsavel_nome: string; responsavel_email: string
  responsavel_whatsapp: string; nicho: string; plano_id: string
  status: string; billing_status: string; loja_nome: string; cidade: string
  prazo_acesso: string; valor_pago: string; origem: string
  observacao: string; comprovante_url: string
}
type EmpresaForm = {
  nome: string; responsavel_nome: string; responsavel_whatsapp: string
  responsavel_email: string; nicho: string; plano_id: string
  status: string; billing_status: string; notas_internas: string
}
type LojaForm = { nome: string; cidade: string; whatsapp: string; ativa: boolean }

const STATUS_OPCOES = ['em_onboarding', 'trial', 'ativa', 'inativa']
const BILLING_OPCOES = ['trial', 'ativo', 'cancelado', 'suspenso', 'inadimplente', 'cortesia', 'parceiro']
const ROLE_OPCOES = ['dono', 'gerente', 'vendedora', 'admin_f5'] as const

const VAZIO_LIBERAR: LiberarForm = {
  empresa_nome: '', responsavel_nome: '', responsavel_email: '', responsavel_whatsapp: '',
  nicho: '', plano_id: '', status: 'em_onboarding', billing_status: 'trial',
  loja_nome: '', cidade: '', prazo_acesso: '', valor_pago: '',
  origem: '', observacao: '', comprovante_url: '',
}
const VAZIO_EMPRESA: EmpresaForm = {
  nome: '', responsavel_nome: '', responsavel_whatsapp: '', responsavel_email: '',
  nicho: '', plano_id: '', status: 'em_onboarding', billing_status: 'trial', notas_internas: '',
}
const VAZIO_LOJA: LojaForm = { nome: '', cidade: '', whatsapp: '', ativa: true }

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder = '' }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Badge({ value }: { value: string }) {
  const map: Record<string, string> = {
    ativa: 'bg-green-100 text-green-800', ativo: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800', em_onboarding: 'bg-yellow-100 text-yellow-800',
    pendente: 'bg-yellow-100 text-yellow-800', aplicado: 'bg-green-100 text-green-800',
    cancelado: 'bg-zinc-100 text-zinc-500', inativa: 'bg-zinc-100 text-zinc-500',
    suspenso: 'bg-red-100 text-red-700', inadimplente: 'bg-red-100 text-red-700',
    cortesia: 'bg-purple-100 text-purple-700', parceiro: 'bg-indigo-100 text-indigo-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? 'bg-zinc-100 text-zinc-600'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-zinc-200 px-4 py-3">
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminClient({
  empresas, planos, liberacoes, stats,
}: {
  empresas: EmpresaRow[]
  planos: PlanoOption[]
  liberacoes: LiberacaoRow[]
  stats: AdminStats
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [tab, setTab] = useState<Tab>('liberar')
  const [msg, setMsg] = useState<Msg>(null)

  // Liberar acesso
  const [liberarForm, setLiberarForm] = useState<LiberarForm>(VAZIO_LIBERAR)
  const [liberarResultado, setLiberarResultado] = useState<{
    resultado: 'vinculado' | 'pendente'; empresa_id?: string; loja_id?: string
  } | null>(null)

  // Empresas tab
  const [empresaFormMode, setEmpresaFormMode] = useState<'none' | 'nova' | 'editar'>('none')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [empresaForm, setEmpresaForm] = useState<EmpresaForm>(VAZIO_EMPRESA)
  const [lojaEmpresaId, setLojaEmpresaId] = useState<string | null>(null)
  const [lojaForm, setLojaForm] = useState<LojaForm>(VAZIO_LOJA)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Acessos tab
  const [emailBusca, setEmailBusca] = useState('')
  const [usuario, setUsuario] = useState<UsuarioResult | null>(null)
  const [buscaErro, setBuscaErro] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [vinculoLojaId, setVinculoLojaId] = useState('')
  const [vinculoRole, setVinculoRole] = useState<typeof ROLE_OPCOES[number]>('vendedora')

  function showMsg(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 5000)
  }

  // ── Plano options ──────────────────────────────────────────────────────────

  const planoOpcoes = [
    { value: '', label: 'Selecione um plano' },
    ...planos.map(p => ({
      value: p.id,
      label: `${p.nome}${p.max_lojas != null ? ` — até ${p.max_lojas} loja${p.max_lojas > 1 ? 's' : ''}` : ' — sem limite'}`,
    })),
  ]

  // ── Liberar Acesso ─────────────────────────────────────────────────────────

  function setLF(field: keyof LiberarForm, v: string) {
    setLiberarForm(prev => ({ ...prev, [field]: v }))
  }

  function submitLiberar() {
    setLiberarResultado(null)
    startTransition(async () => {
      const res = await liberarAcesso(liberarForm)
      if (res.ok) {
        setLiberarResultado({ resultado: res.resultado!, empresa_id: res.empresa_id, loja_id: res.loja_id })
        setLiberarForm(VAZIO_LIBERAR)
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao liberar acesso.')
      }
    })
  }

  // ── Empresas ───────────────────────────────────────────────────────────────

  function setEF(field: keyof EmpresaForm, v: string) {
    setEmpresaForm(prev => ({ ...prev, [field]: v }))
  }

  function abrirEditarEmpresa(e: EmpresaRow) {
    setEmpresaForm({
      nome: e.nome, responsavel_nome: e.responsavel_nome ?? '',
      responsavel_whatsapp: e.responsavel_whatsapp ?? '',
      responsavel_email: e.responsavel_email ?? '',
      nicho: e.nicho ?? '', plano_id: e.plano_id ?? '',
      status: e.status, billing_status: e.billing_status ?? 'trial',
      notas_internas: e.notas_internas ?? '',
    })
    setEmpresaFormMode('editar')
    setEditandoId(e.id)
    setLojaEmpresaId(null)
  }

  function fecharEmpresaForm() { setEmpresaFormMode('none'); setEditandoId(null) }
  function fecharLojaForm() { setLojaEmpresaId(null) }

  function submitEmpresa() {
    startTransition(async () => {
      if (empresaFormMode === 'nova') {
        const res = await criarEmpresa(empresaForm)
        if (res.ok) { showMsg('ok', 'Empresa criada.'); fecharEmpresaForm(); router.refresh() }
        else showMsg('erro', res.erro ?? 'Erro.')
      } else if (empresaFormMode === 'editar' && editandoId) {
        const res = await atualizarEmpresa({ id: editandoId, ...empresaForm })
        if (res.ok) { showMsg('ok', 'Empresa atualizada.'); fecharEmpresaForm(); router.refresh() }
        else showMsg('erro', res.erro ?? 'Erro.')
      }
    })
  }

  function submitLoja() {
    if (!lojaEmpresaId) return
    startTransition(async () => {
      const res = await criarLoja({ empresa_id: lojaEmpresaId, ...lojaForm })
      if (res.ok) {
        showMsg('ok', 'Loja criada.')
        setExpandedId(lojaEmpresaId)
        fecharLojaForm()
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro.')
      }
    })
  }

  // ── Acessos ────────────────────────────────────────────────────────────────

  async function handleBuscar() {
    if (!emailBusca.trim()) return
    setBuscando(true); setBuscaErro(null); setUsuario(null)
    const res = await buscarUsuarioPorEmail(emailBusca)
    setBuscando(false)
    if (res.ok && res.usuario) { setUsuario(res.usuario); setVinculoLojaId(''); setVinculoRole('vendedora') }
    else setBuscaErro(res.erro ?? 'Usuário não encontrado.')
  }

  async function refreshUsuario() {
    if (!emailBusca.trim()) return
    const res = await buscarUsuarioPorEmail(emailBusca)
    if (res.ok && res.usuario) setUsuario(res.usuario)
  }

  function submitVinculo() {
    if (!usuario || !vinculoLojaId) return
    startTransition(async () => {
      const res = await vincularUsuario({ perfil_id: usuario.id, loja_id: vinculoLojaId, role: vinculoRole })
      if (res.ok) { showMsg('ok', 'Vínculo criado.'); await refreshUsuario(); router.refresh() }
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  function toggleAcesso(membro_id: string, ativo: boolean) {
    startTransition(async () => {
      const res = await alterarAcesso(membro_id, !ativo)
      if (res.ok) { await refreshUsuario(); router.refresh() }
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  function handleCancelarLiberacao(id: string) {
    startTransition(async () => {
      const res = await cancelarLiberacao(id)
      if (res.ok) { showMsg('ok', 'Liberação cancelada.'); router.refresh() }
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  // Lojas visíveis (não admin_only) para dropdown de vínculo
  const todasLojas = empresas.flatMap(e =>
    e.lojas
      .filter((l: LojaRow) => l.ativa && !l.admin_only)
      .map((l: LojaRow) => ({ id: l.id, label: `${e.nome} → ${l.nome}` }))
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold tracking-widest uppercase text-zinc-100">Admin</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Painel de Acesso F5</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">
              App operacional →
            </a>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-zinc-400 hover:text-white transition-colors">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Empresas" value={stats.total_empresas} />
          <StatCard label="Lojas ativas" value={stats.total_lojas} />
          <StatCard label="Acessos pendentes" value={stats.total_pendentes} />
        </div>

        {/* Global message */}
        {msg && (
          <div className={`rounded-md px-4 py-3 text-sm border ${msg.tipo === 'ok'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-700 border-red-200'}`}>
            {msg.texto}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 gap-1 bg-transparent">
          {([
            { key: 'liberar', label: 'Liberar acesso' },
            { key: 'empresas', label: 'Empresas' },
            { key: 'acessos', label: 'Acessos' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ───── TAB: Liberar Acesso ───── */}
        {tab === 'liberar' && (
          <div className="space-y-5">

            {/* Resultado da última liberação */}
            {liberarResultado && (
              <div className={`rounded-lg border p-4 text-sm space-y-1 ${
                liberarResultado.resultado === 'vinculado'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                {liberarResultado.resultado === 'vinculado' ? (
                  <>
                    <p className="font-semibold">Acesso liberado com sucesso</p>
                    <p>Empresa e loja criadas. Usuário vinculado como dono — pode logar agora.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Liberação pendente registrada</p>
                    <p>Empresa e loja criadas. Quando o usuário criar conta com esse e-mail, o acesso será aplicado automaticamente.</p>
                  </>
                )}
                <button onClick={() => setLiberarResultado(null)} className="text-xs underline opacity-70 hover:opacity-100">
                  Fechar
                </button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-zinc-200 p-6 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-zinc-800">Liberar acesso</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Cria empresa, loja e vínculo em uma ação. Se o usuário ainda não existe, registra liberação pendente.
                </p>
              </div>

              {/* Empresa / Responsável */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Empresa / Rede</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome da empresa / rede *">
                    <Input value={liberarForm.empresa_nome} onChange={v => setLF('empresa_nome', v)} />
                  </Field>
                  <Field label="Nicho">
                    <Input value={liberarForm.nicho} onChange={v => setLF('nicho', v)} placeholder="Ex: suplementos" />
                  </Field>
                  <Field label="Responsável / dono *">
                    <Input value={liberarForm.responsavel_nome} onChange={v => setLF('responsavel_nome', v)} />
                  </Field>
                  <Field label="E-mail do responsável *">
                    <Input value={liberarForm.responsavel_email} onChange={v => setLF('responsavel_email', v)} type="email" />
                  </Field>
                  <Field label="WhatsApp">
                    <Input value={liberarForm.responsavel_whatsapp} onChange={v => setLF('responsavel_whatsapp', v)} type="tel" />
                  </Field>
                  <Field label="Plano">
                    <Select value={liberarForm.plano_id} onChange={v => setLF('plano_id', v)} options={planoOpcoes} />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={liberarForm.status}
                      onChange={v => setLF('status', v)}
                      options={STATUS_OPCOES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
                    />
                  </Field>
                  <Field label="Billing status">
                    <Select
                      value={liberarForm.billing_status}
                      onChange={v => setLF('billing_status', v)}
                      options={BILLING_OPCOES.map(s => ({ value: s, label: s }))}
                    />
                  </Field>
                </div>
              </div>

              {/* Loja inicial */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Loja inicial</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome da loja *">
                    <Input value={liberarForm.loja_nome} onChange={v => setLF('loja_nome', v)} />
                  </Field>
                  <Field label="Cidade">
                    <Input value={liberarForm.cidade} onChange={v => setLF('cidade', v)} />
                  </Field>
                </div>
              </div>

              {/* Dados comerciais */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Dados comerciais</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Valor pago / mensalidade">
                    <Input value={liberarForm.valor_pago} onChange={v => setLF('valor_pago', v)} placeholder="0,00" />
                  </Field>
                  <Field label="Prazo de acesso">
                    <Input value={liberarForm.prazo_acesso} onChange={v => setLF('prazo_acesso', v)} type="date" />
                  </Field>
                  <Field label="Origem">
                    <Input value={liberarForm.origem} onChange={v => setLF('origem', v)} placeholder="Ex: Instagram, indicação" />
                  </Field>
                  <Field label="Link do comprovante">
                    <Input value={liberarForm.comprovante_url} onChange={v => setLF('comprovante_url', v)} type="url" placeholder="https://" />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Observação interna">
                    <textarea
                      value={liberarForm.observacao}
                      onChange={e => setLF('observacao', e.target.value)}
                      rows={2}
                      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                    />
                  </Field>
                </div>
              </div>

              <button
                onClick={submitLiberar}
                disabled={pending || !liberarForm.empresa_nome.trim() || !liberarForm.responsavel_email.trim() || !liberarForm.loja_nome.trim()}
                className="w-full sm:w-auto bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {pending ? 'Liberando...' : 'Liberar acesso'}
              </button>
            </div>
          </div>
        )}

        {/* ───── TAB: Empresas ───── */}
        {tab === 'empresas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">{stats.total_empresas} empresa(s)</p>
              {empresaFormMode === 'none' && lojaEmpresaId === null ? (
                <button
                  onClick={() => { setEmpresaForm(VAZIO_EMPRESA); setEmpresaFormMode('nova'); setLojaEmpresaId(null) }}
                  className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors"
                >
                  + Nova empresa
                </button>
              ) : (
                <button
                  onClick={() => { fecharEmpresaForm(); fecharLojaForm() }}
                  className="text-sm text-zinc-500 hover:text-zinc-800"
                >
                  Cancelar
                </button>
              )}
            </div>

            {/* Empresa form */}
            {empresaFormMode !== 'none' && (
              <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold">
                  {empresaFormMode === 'nova' ? 'Nova empresa' : 'Editar empresa'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome *"><Input value={empresaForm.nome} onChange={v => setEF('nome', v)} /></Field>
                  <Field label="Nicho"><Input value={empresaForm.nicho} onChange={v => setEF('nicho', v)} /></Field>
                  <Field label="Responsável"><Input value={empresaForm.responsavel_nome} onChange={v => setEF('responsavel_nome', v)} /></Field>
                  <Field label="E-mail"><Input value={empresaForm.responsavel_email} onChange={v => setEF('responsavel_email', v)} type="email" /></Field>
                  <Field label="WhatsApp"><Input value={empresaForm.responsavel_whatsapp} onChange={v => setEF('responsavel_whatsapp', v)} type="tel" /></Field>
                  <Field label="Plano">
                    <Select value={empresaForm.plano_id} onChange={v => setEF('plano_id', v)} options={planoOpcoes} />
                  </Field>
                  <Field label="Status">
                    <Select value={empresaForm.status} onChange={v => setEF('status', v)}
                      options={STATUS_OPCOES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
                  </Field>
                  <Field label="Billing status">
                    <Select value={empresaForm.billing_status} onChange={v => setEF('billing_status', v)}
                      options={BILLING_OPCOES.map(s => ({ value: s, label: s }))} />
                  </Field>
                </div>
                <Field label="Notas internas">
                  <textarea
                    value={empresaForm.notas_internas}
                    onChange={e => setEF('notas_internas', e.target.value)}
                    rows={2}
                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none"
                  />
                </Field>
                <button
                  onClick={submitEmpresa}
                  disabled={pending || !empresaForm.nome.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {pending ? 'Salvando...' : empresaFormMode === 'nova' ? 'Criar empresa' : 'Salvar'}
                </button>
              </div>
            )}

            {/* Loja form */}
            {lojaEmpresaId && (
              <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Nova loja</h3>
                  <button onClick={fecharLojaForm} className="text-xs text-zinc-400 hover:text-zinc-700">Cancelar</button>
                </div>
                <p className="text-xs text-zinc-500">
                  Empresa: <strong>{empresas.find(e => e.id === lojaEmpresaId)?.nome}</strong>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome da loja *"><Input value={lojaForm.nome} onChange={v => setLojaForm(p => ({ ...p, nome: v }))} /></Field>
                  <Field label="Cidade"><Input value={lojaForm.cidade} onChange={v => setLojaForm(p => ({ ...p, cidade: v }))} /></Field>
                  <Field label="WhatsApp"><Input value={lojaForm.whatsapp} onChange={v => setLojaForm(p => ({ ...p, whatsapp: v }))} type="tel" /></Field>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="loja-ativa" checked={lojaForm.ativa}
                      onChange={e => setLojaForm(p => ({ ...p, ativa: e.target.checked }))} className="h-4 w-4" />
                    <label htmlFor="loja-ativa" className="text-sm text-zinc-700">Loja ativa</label>
                  </div>
                </div>
                <button
                  onClick={submitLoja}
                  disabled={pending || !lojaForm.nome.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {pending ? 'Criando...' : 'Criar loja'}
                </button>
              </div>
            )}

            {/* Lista de empresas */}
            <div className="space-y-3">
              {empresas
                .filter(e => !e.lojas.every((l: LojaRow) => l.admin_only))
                .map(empresa => {
                  const isAtLimit = empresa.plano_max_lojas !== null && empresa.qtd_lojas >= empresa.plano_max_lojas
                  const isExpanded = expandedId === empresa.id
                  const lojasVisiveis = empresa.lojas.filter((l: LojaRow) => !l.admin_only)

                  return (
                    <div key={empresa.id} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
                      <div className="flex items-start gap-2 justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-900 truncate">{empresa.nome}</p>
                          {empresa.responsavel_nome && <p className="text-sm text-zinc-500">{empresa.responsavel_nome}</p>}
                          {empresa.responsavel_email && <p className="text-xs text-zinc-400">{empresa.responsavel_email}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge value={empresa.status} />
                          {empresa.billing_status && empresa.billing_status !== empresa.status && (
                            <Badge value={empresa.billing_status} />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <span className="text-zinc-500">{empresa.plano_nome ?? 'Sem plano'}</span>
                        <span className="text-zinc-300">·</span>
                        <span className={isAtLimit ? 'text-red-600 font-medium' : 'text-zinc-500'}>
                          {empresa.qtd_lojas} / {empresa.plano_max_lojas ?? '∞'} lojas
                        </span>
                        {isAtLimit && (
                          <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                            Limite atingido
                          </span>
                        )}
                        {empresa.nicho && (
                          <><span className="text-zinc-300">·</span><span className="text-zinc-400 text-xs">{empresa.nicho}</span></>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setExpandedId(isExpanded ? null : empresa.id)}
                          className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-50 transition-colors">
                          {isExpanded ? 'Ocultar' : `Lojas (${lojasVisiveis.length})`}
                        </button>
                        <button onClick={() => abrirEditarEmpresa(empresa)}
                          className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-50 transition-colors">
                          Editar
                        </button>
                        {isAtLimit ? (
                          <button onClick={() => abrirEditarEmpresa(empresa)}
                            className="text-xs bg-zinc-900 text-white rounded px-2 py-1 hover:bg-zinc-700 transition-colors">
                            Fazer upgrade
                          </button>
                        ) : (
                          <button onClick={() => { setLojaEmpresaId(empresa.id); setLojaForm(VAZIO_LOJA); fecharEmpresaForm() }}
                            className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-50 transition-colors">
                            + Loja
                          </button>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="border-t border-zinc-100 pt-3 space-y-2">
                          {lojasVisiveis.length === 0 && <p className="text-sm text-zinc-400">Nenhuma loja.</p>}
                          {lojasVisiveis.map((l: LojaRow) => (
                            <div key={l.id} className="flex items-center justify-between text-sm py-1">
                              <div>
                                <span className="font-medium text-zinc-800">{l.nome}</span>
                                {l.cidade && <span className="text-zinc-400 text-xs ml-2">{l.cidade}</span>}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded ${l.ativa ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                {l.ativa ? 'Ativa' : 'Inativa'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {empresa.notas_internas && (
                        <p className="text-xs text-zinc-400 border-t border-zinc-100 pt-2 italic">{empresa.notas_internas}</p>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* ───── TAB: Acessos ───── */}
        {tab === 'acessos' && (
          <div className="space-y-5">

            {/* Busca */}
            <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800">Buscar usuário</h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailBusca}
                  onChange={e => setEmailBusca(e.target.value)}
                  placeholder="usuario@email.com"
                  onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  className="flex-1 border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <button
                  onClick={handleBuscar}
                  disabled={buscando || !emailBusca.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {buscaErro && <p className="text-sm text-red-600">{buscaErro}</p>}

              {usuario && (
                <div className="border-t border-zinc-100 pt-4 space-y-4">
                  <div>
                    <p className="font-medium text-zinc-900">{usuario.nome ?? '(sem nome)'}</p>
                    <p className="text-sm text-zinc-500">{usuario.email}</p>
                  </div>

                  {/* Vínculos */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Vínculos</p>
                    {usuario.vinculos.length === 0 && <p className="text-sm text-zinc-400">Nenhum vínculo.</p>}
                    {usuario.vinculos.map(v => (
                      <div key={v.membro_id} className="flex items-center justify-between text-sm border border-zinc-100 rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-800 truncate">{v.loja_nome}</span>
                          <span className="text-zinc-400 text-xs ml-2">— {v.role}</span>
                        </div>
                        <button
                          onClick={() => toggleAcesso(v.membro_id, v.ativo)}
                          disabled={pending}
                          className={`shrink-0 text-xs px-2 py-0.5 rounded transition-colors ${
                            v.ativo ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          {v.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Nova vinculação */}
                  <div className="border-t border-zinc-100 pt-4 space-y-3">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Adicionar vínculo</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Loja">
                        <select value={vinculoLojaId} onChange={e => setVinculoLojaId(e.target.value)}
                          className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                          <option value="">Selecione a loja</option>
                          {todasLojas.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Papel">
                        <select value={vinculoRole} onChange={e => setVinculoRole(e.target.value as typeof ROLE_OPCOES[number])}
                          className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                          {ROLE_OPCOES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                    </div>
                    <button
                      onClick={submitVinculo}
                      disabled={pending || !vinculoLojaId}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                    >
                      {pending ? 'Vinculando...' : 'Vincular'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Liberações recentes */}
            <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800">
                Liberações recentes
                {stats.total_pendentes > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {stats.total_pendentes} pendente{stats.total_pendentes > 1 ? 's' : ''}
                  </span>
                )}
              </h3>
              {liberacoes.length === 0 && <p className="text-sm text-zinc-400">Nenhuma liberação registrada.</p>}
              <div className="space-y-2">
                {liberacoes.map(l => (
                  <div key={l.id} className="flex items-start justify-between gap-3 text-sm border border-zinc-100 rounded-md px-3 py-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium text-zinc-800 truncate">{l.email}</p>
                      {l.nome && <p className="text-xs text-zinc-500">{l.nome}</p>}
                      <p className="text-xs text-zinc-400">
                        {l.empresa_nome && <><span>{l.empresa_nome}</span><span className="mx-1">·</span></>}
                        {l.loja_nome && <span>{l.loja_nome}</span>}
                        <span className="mx-1">·</span>
                        <span>{l.role}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge value={l.status} />
                      {l.status === 'pendente' && (
                        <button
                          onClick={() => handleCancelarLiberacao(l.id)}
                          disabled={pending}
                          className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
