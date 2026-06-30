'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EmpresaRow, PlanoOption, LojaRow, LiberacaoRow, AdminStats, AcessoLoja, MembroLoja } from './page'
import type { UsuarioResult } from './actions'
import {
  liberarAcesso,
  criarEmpresa, atualizarEmpresa, criarLoja, atualizarLoja,
  buscarUsuarioPorEmail, vincularUsuario, alterarAcesso, cancelarLiberacao,
  adicionarAcessoLoja,
} from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Msg = { tipo: 'ok' | 'erro'; texto: string } | null
type Tab = 'licenca' | 'empresas' | 'lojas' | 'acessos_loja' | 'acessos'

type LiberarForm = {
  loja_nome: string; loja_whatsapp: string; cidade: string; nicho: string
  responsavel_nome: string; responsavel_email: string; responsavel_whatsapp: string
  empresa_existente_id: string; empresa_nome: string
  valor_mensal: string; billing_status: string; status: string
  prazo_acesso: string; origem: string; observacao: string; comprovante_url: string
}
type EmpresaForm = {
  nome: string; responsavel_nome: string; responsavel_whatsapp: string
  responsavel_email: string; nicho: string; plano_id: string
  status: string; billing_status: string; notas_internas: string
}
type LojaEditForm = { nome: string; cidade: string; whatsapp: string; ativa: boolean }

const STATUS_OPCOES = ['em_onboarding', 'trial', 'ativa', 'inativa', 'cancelado', 'suspenso']
const BILLING_OPCOES = ['trial', 'ativo', 'cancelado', 'suspenso', 'inadimplente', 'cortesia', 'parceiro']
const ROLE_OPCOES = ['dono', 'gerente', 'vendedora', 'admin_f5'] as const
const LICENCA_VALOR = 149

const VAZIO_LIBERAR: LiberarForm = {
  loja_nome: '', loja_whatsapp: '', cidade: '', nicho: '',
  responsavel_nome: '', responsavel_email: '', responsavel_whatsapp: '',
  empresa_existente_id: '', empresa_nome: '',
  valor_mensal: '149,00',
  billing_status: 'trial', status: 'em_onboarding',
  prazo_acesso: '', origem: '', observacao: '', comprovante_url: '',
}
const VAZIO_EMPRESA: EmpresaForm = {
  nome: '', responsavel_nome: '', responsavel_whatsapp: '', responsavel_email: '',
  nicho: '', plano_id: '', status: 'em_onboarding', billing_status: 'trial', notas_internas: '',
}
const VAZIO_LOJA_EDIT: LojaEditForm = { nome: '', cidade: '', whatsapp: '', ativa: true }

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
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} disabled={disabled}
      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-400"
    />
  )
}

function Sel({ value, onChange, options }: {
  value: string; onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function Badge({ value }: { value: string }) {
  const map: Record<string, string> = {
    ativa: 'bg-green-100 text-green-800', ativo: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800', em_onboarding: 'bg-yellow-100 text-yellow-800',
    pendente: 'bg-yellow-100 text-yellow-800', aplicado: 'bg-green-100 text-green-800',
    vinculado: 'bg-green-100 text-green-800',
    cancelado: 'bg-zinc-100 text-zinc-500', inativa: 'bg-zinc-100 text-zinc-500',
    inativo: 'bg-zinc-100 text-zinc-500',
    suspenso: 'bg-red-100 text-red-700', inadimplente: 'bg-red-100 text-red-700',
    cortesia: 'bg-purple-100 text-purple-700', parceiro: 'bg-indigo-100 text-indigo-700',
    dono: 'bg-zinc-800 text-white', gerente: 'bg-zinc-200 text-zinc-700',
    vendedora: 'bg-zinc-100 text-zinc-600', admin_f5: 'bg-rose-100 text-rose-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? 'bg-zinc-100 text-zinc-600'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border px-4 py-3 ${highlight ? 'border-green-200' : 'border-zinc-200'}`}>
      <p className={`text-xl font-bold ${highlight ? 'text-green-700' : 'text-zinc-900'}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">{children}</p>
}

function formatBRL(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR')
}

function maxTrialDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminClient({
  empresas, planos, liberacoes, stats, acessosPorLoja,
}: {
  empresas: EmpresaRow[]
  planos: PlanoOption[]
  liberacoes: LiberacaoRow[]
  stats: AdminStats
  acessosPorLoja: AcessoLoja[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [tab, setTab] = useState<Tab>('licenca')
  const [msg, setMsg] = useState<Msg>(null)

  // ── Liberar licença state ──────────────────────────────────────────────────
  const [liberarForm, setLiberarForm] = useState<LiberarForm>(VAZIO_LIBERAR)
  const [empresaMode, setEmpresaMode] = useState<'nova' | 'existente'>('nova')
  const [liberarResultado, setLiberarResultado] = useState<{
    resultado: 'vinculado' | 'pendente'; empresa_id?: string; loja_id?: string
  } | null>(null)

  // ── Empresas state ─────────────────────────────────────────────────────────
  const [empresaFormMode, setEmpresaFormMode] = useState<'none' | 'nova' | 'editar'>('none')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [empresaForm, setEmpresaForm] = useState<EmpresaForm>(VAZIO_EMPRESA)
  const [lojaEmpresaId, setLojaEmpresaId] = useState<string | null>(null)
  const [lojaForm, setLojaForm] = useState<{ nome: string; cidade: string; whatsapp: string; ativa: boolean }>({ nome: '', cidade: '', whatsapp: '', ativa: true })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Lojas state ────────────────────────────────────────────────────────────
  const [lojaEditId, setLojaEditId] = useState<string | null>(null)
  const [lojaEditForm, setLojaEditForm] = useState<LojaEditForm>(VAZIO_LOJA_EDIT)

  // ── Acessos por Loja state ─────────────────────────────────────────────────
  const [aclBusca, setAclBusca] = useState('')
  const [aclFiltroEmpresa, setAclFiltroEmpresa] = useState('')
  const [aclVinculoLojaId, setAclVinculoLojaId] = useState<string | null>(null)
  const [aclEmail, setAclEmail] = useState('')
  const [aclNome, setAclNome] = useState('')
  const [aclRole, setAclRole] = useState<typeof ROLE_OPCOES[number]>('vendedora')

  // ── Acessos state ──────────────────────────────────────────────────────────
  const [emailBusca, setEmailBusca] = useState('')
  const [usuario, setUsuario] = useState<UsuarioResult | null>(null)
  const [buscaErro, setBuscaErro] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [vinculoLojaId, setVinculoLojaId] = useState('')
  const [vinculoRole, setVinculoRole] = useState<typeof ROLE_OPCOES[number]>('vendedora')

  function showMsg(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 6000)
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const empresasVisiveis = empresas.filter(e => !e.lojas.every((l: LojaRow) => l.admin_only))

  const todasLojas = empresas.flatMap(e =>
    e.lojas.filter((l: LojaRow) => l.ativa && !l.admin_only)
      .map((l: LojaRow) => ({ id: l.id, label: `${e.nome} → ${l.nome}` }))
  )

  const empresaOpcoes = [
    { value: '', label: 'Selecione empresa/rede existente' },
    ...empresasVisiveis.map(e => ({ value: e.id, label: e.nome })),
  ]

  const planoOpcoes = [
    { value: '', label: 'Sem plano' },
    ...planos.map(p => ({ value: p.id, label: p.nome })),
  ]

  const aclFiltradas = acessosPorLoja
    .filter(a => !aclFiltroEmpresa || a.empresa_id === aclFiltroEmpresa)
    .filter(a => !aclBusca || a.loja_nome.toLowerCase().includes(aclBusca.toLowerCase()) || a.empresa_nome.toLowerCase().includes(aclBusca.toLowerCase()))

  // ── Handlers: Liberar licença ──────────────────────────────────────────────

  function setLF(field: keyof LiberarForm, v: string) {
    setLiberarForm(prev => ({ ...prev, [field]: v }))
  }

  function submitLiberar() {
    if (liberarForm.billing_status === 'trial' && liberarForm.prazo_acesso) {
      if (liberarForm.prazo_acesso > maxTrialDate()) {
        showMsg('erro', 'Trial máximo de 7 dias. Ajuste a data de acesso.')
        return
      }
    }
    setLiberarResultado(null)
    const dados = {
      ...liberarForm,
      empresa_existente_id: empresaMode === 'existente' ? liberarForm.empresa_existente_id : '',
      empresa_nome: empresaMode === 'nova' ? liberarForm.empresa_nome : '',
      valor_pago: liberarForm.valor_mensal,
      plano_id: '',
    }
    startTransition(async () => {
      const res = await liberarAcesso(dados)
      if (res.ok) {
        setLiberarResultado({ resultado: res.resultado!, empresa_id: res.empresa_id, loja_id: res.loja_id })
        setLiberarForm(VAZIO_LIBERAR)
        setEmpresaMode('nova')
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao liberar licença.')
      }
    })
  }

  // ── Handlers: Empresas ─────────────────────────────────────────────────────

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

  function submitEmpresa() {
    startTransition(async () => {
      if (empresaFormMode === 'nova') {
        const res = await criarEmpresa(empresaForm)
        if (res.ok) { showMsg('ok', 'Empresa/rede criada.'); setEmpresaFormMode('none'); router.refresh() }
        else showMsg('erro', res.erro ?? 'Erro.')
      } else if (empresaFormMode === 'editar' && editandoId) {
        const res = await atualizarEmpresa({ id: editandoId, ...empresaForm })
        if (res.ok) { showMsg('ok', 'Empresa atualizada.'); setEmpresaFormMode('none'); setEditandoId(null); router.refresh() }
        else showMsg('erro', res.erro ?? 'Erro.')
      }
    })
  }

  function submitLoja() {
    if (!lojaEmpresaId) return
    startTransition(async () => {
      const res = await criarLoja({ empresa_id: lojaEmpresaId, ...lojaForm })
      if (res.ok) {
        showMsg('ok', 'Licença de loja criada.')
        setExpandedId(lojaEmpresaId)
        setLojaEmpresaId(null)
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro.')
      }
    })
  }

  // ── Handlers: Lojas ────────────────────────────────────────────────────────

  function abrirEditarLoja(l: LojaRow) {
    setLojaEditForm({ nome: l.nome, cidade: l.cidade ?? '', whatsapp: l.whatsapp ?? '', ativa: l.ativa })
    setLojaEditId(l.id)
  }

  function submitEditarLoja() {
    if (!lojaEditId) return
    startTransition(async () => {
      const res = await atualizarLoja({ id: lojaEditId, ...lojaEditForm })
      if (res.ok) { showMsg('ok', 'Loja atualizada.'); setLojaEditId(null); router.refresh() }
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  function desativarLoja(l: LojaRow) {
    startTransition(async () => {
      const res = await atualizarLoja({ id: l.id, nome: l.nome, cidade: l.cidade ?? '', whatsapp: l.whatsapp ?? '', ativa: false })
      if (res.ok) { showMsg('ok', `Loja "${l.nome}" desativada.`); router.refresh() }
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  // ── Handlers: Acessos por Loja ─────────────────────────────────────────────

  function submitAclVinculo() {
    if (!aclVinculoLojaId || !aclEmail.trim()) return
    startTransition(async () => {
      const res = await adicionarAcessoLoja({ loja_id: aclVinculoLojaId, email: aclEmail, nome: aclNome, role: aclRole })
      if (res.ok) {
        showMsg('ok', res.resultado === 'vinculado' ? 'Usuário vinculado.' : 'Liberação pendente criada.')
        setAclVinculoLojaId(null)
        setAclEmail('')
        setAclNome('')
        setAclRole('vendedora')
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro.')
      }
    })
  }

  function toggleAcessoAcl(membro_id: string, ativo: boolean) {
    startTransition(async () => {
      const res = await alterarAcesso(membro_id, !ativo)
      if (res.ok) router.refresh()
      else showMsg('erro', res.erro ?? 'Erro.')
    })
  }

  // ── Handlers: Acessos ──────────────────────────────────────────────────────

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

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string }[] = [
    { key: 'licenca', label: 'Liberar licença' },
    { key: 'empresas', label: 'Empresas / Redes' },
    { key: 'lojas', label: 'Lojas / Licenças' },
    { key: 'acessos_loja', label: 'Acessos por Loja' },
    { key: 'acessos', label: 'Acessos' },
  ]

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* Header */}
      <header className="bg-zinc-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Admin</h1>
            <p className="text-xs text-zinc-400 mt-0.5">F5 Recompra — Gestão de Licenças</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">
              App operacional →
            </a>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-xs text-zinc-400 hover:text-white transition-colors">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Empresas / redes" value={stats.total_empresas} />
          <StatCard label="Lojas ativas faturáveis" value={stats.total_lojas} sub={`${stats.total_lojas} licença${stats.total_lojas !== 1 ? 's' : ''} ativas`} />
          <StatCard label="Acessos pendentes" value={stats.total_pendentes} />
          <StatCard label="Receita estimada" value={formatBRL(stats.receita_estimada) + '/mês'} sub={`R$${LICENCA_VALOR}/loja/mês`} highlight />
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
        <div className="flex border-b border-zinc-200 gap-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═════════════════════════════════════════════════
            TAB: Liberar licença
        ═════════════════════════════════════════════════ */}
        {tab === 'licenca' && (
          <div className="space-y-5">
            {liberarResultado && (
              <div className={`rounded-lg border p-4 text-sm space-y-1 ${
                liberarResultado.resultado === 'vinculado'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}>
                {liberarResultado.resultado === 'vinculado' ? (
                  <>
                    <p className="font-semibold">Licença liberada — acesso ativo</p>
                    <p>Loja criada e dono vinculado. Pode logar agora.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Licença criada — acesso pendente</p>
                    <p>Loja criada. Quando o dono criar conta com esse e-mail, o acesso é aplicado automaticamente.</p>
                  </>
                )}
                <button onClick={() => setLiberarResultado(null)} className="text-xs underline opacity-70 hover:opacity-100">Fechar</button>
              </div>
            )}

            <div className="bg-white rounded-lg border border-zinc-200 p-6 space-y-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-800">Liberar licença de loja</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Cria a loja (licença R${LICENCA_VALOR}/mês), vincula o dono e registra dados comerciais.
                </p>
              </div>

              {/* Seção: Dados da loja */}
              <div>
                <SectionLabel>Dados da loja</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome da loja *">
                    <Inp value={liberarForm.loja_nome} onChange={v => setLF('loja_nome', v)} />
                  </Field>
                  <Field label="Cidade">
                    <Inp value={liberarForm.cidade} onChange={v => setLF('cidade', v)} />
                  </Field>
                  <Field label="WhatsApp da loja">
                    <Inp value={liberarForm.loja_whatsapp} onChange={v => setLF('loja_whatsapp', v)} type="tel" placeholder="(47) 9xxxx-xxxx" />
                  </Field>
                  <Field label="Nicho">
                    <Inp value={liberarForm.nicho} onChange={v => setLF('nicho', v)} placeholder="Ex: suplementos, farmácia" />
                  </Field>
                </div>
              </div>

              {/* Seção: Dados do dono */}
              <div>
                <SectionLabel>Dados do dono</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome do dono">
                    <Inp value={liberarForm.responsavel_nome} onChange={v => setLF('responsavel_nome', v)} />
                  </Field>
                  <Field label="E-mail do dono *">
                    <Inp value={liberarForm.responsavel_email} onChange={v => setLF('responsavel_email', v)} type="email" />
                  </Field>
                  <Field label="WhatsApp do dono">
                    <Inp value={liberarForm.responsavel_whatsapp} onChange={v => setLF('responsavel_whatsapp', v)} type="tel" placeholder="(47) 9xxxx-xxxx" />
                  </Field>
                </div>
              </div>

              {/* Seção: Empresa/Rede */}
              <div>
                <SectionLabel>Empresa / Rede de agrupamento</SectionLabel>
                <div className="flex gap-4 mb-3">
                  {(['nova', 'existente'] as const).map(m => (
                    <label key={m} className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                      <input type="radio" name="empresaMode" value={m} checked={empresaMode === m}
                        onChange={() => setEmpresaMode(m)} className="h-4 w-4" />
                      {m === 'nova' ? 'Criar nova empresa/rede' : 'Usar empresa/rede existente'}
                    </label>
                  ))}
                </div>
                {empresaMode === 'nova' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Nome da empresa / rede *">
                      <Inp value={liberarForm.empresa_nome} onChange={v => setLF('empresa_nome', v)} />
                    </Field>
                    <Field label="Status comercial">
                      <Sel value={liberarForm.status} onChange={v => setLF('status', v)}
                        options={STATUS_OPCOES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
                    </Field>
                  </div>
                ) : (
                  <Field label="Empresa / Rede existente *">
                    <Sel value={liberarForm.empresa_existente_id} onChange={v => setLF('empresa_existente_id', v)} options={empresaOpcoes} />
                  </Field>
                )}
              </div>

              {/* Seção: Comercial */}
              <div>
                <SectionLabel>Dados comerciais</SectionLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Valor mensal (R$)">
                    <Inp value={liberarForm.valor_mensal} onChange={v => setLF('valor_mensal', v)} placeholder="149,00" />
                  </Field>
                  <Field label="Billing status">
                    <Sel value={liberarForm.billing_status} onChange={v => setLF('billing_status', v)}
                      options={BILLING_OPCOES.map(s => ({ value: s, label: s }))} />
                  </Field>
                  <Field label={`Trial até${liberarForm.billing_status === 'trial' ? ` (máx: ${maxTrialDate()})` : ''}`}>
                    <Inp
                      value={liberarForm.prazo_acesso}
                      onChange={v => setLF('prazo_acesso', v)}
                      type="date"
                      disabled={liberarForm.billing_status !== 'trial'}
                    />
                  </Field>
                  <Field label="Origem">
                    <Inp value={liberarForm.origem} onChange={v => setLF('origem', v)} placeholder="Instagram, indicação..." />
                  </Field>
                  <Field label="Link do comprovante">
                    <Inp value={liberarForm.comprovante_url} onChange={v => setLF('comprovante_url', v)} type="url" placeholder="https://" />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field label="Observação interna">
                    <textarea value={liberarForm.observacao} onChange={e => setLF('observacao', e.target.value)}
                      rows={2}
                      className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none" />
                  </Field>
                </div>
              </div>

              <button
                onClick={submitLiberar}
                disabled={
                  pending ||
                  !liberarForm.loja_nome.trim() ||
                  !liberarForm.responsavel_email.trim() ||
                  (empresaMode === 'nova' && !liberarForm.empresa_nome.trim()) ||
                  (empresaMode === 'existente' && !liberarForm.empresa_existente_id)
                }
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
              >
                {pending ? 'Liberando...' : `Liberar licença — R$${LICENCA_VALOR}/mês`}
              </button>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════
            TAB: Empresas / Redes
        ═════════════════════════════════════════════════ */}
        {tab === 'empresas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">{stats.total_empresas} empresa(s)/rede(s)</p>
              {empresaFormMode === 'none' && lojaEmpresaId === null ? (
                <button onClick={() => { setEmpresaForm(VAZIO_EMPRESA); setEmpresaFormMode('nova') }}
                  className="text-sm bg-zinc-900 text-white px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors">
                  + Nova empresa / rede
                </button>
              ) : (
                <button onClick={() => { setEmpresaFormMode('none'); setEditandoId(null); setLojaEmpresaId(null) }}
                  className="text-sm text-zinc-500 hover:text-zinc-800">
                  Cancelar
                </button>
              )}
            </div>

            {/* Empresa form */}
            {empresaFormMode !== 'none' && (
              <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-4">
                <h3 className="text-sm font-semibold">{empresaFormMode === 'nova' ? 'Nova empresa / rede' : 'Editar empresa / rede'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome *"><Inp value={empresaForm.nome} onChange={v => setEF('nome', v)} /></Field>
                  <Field label="Nicho"><Inp value={empresaForm.nicho} onChange={v => setEF('nicho', v)} /></Field>
                  <Field label="Responsável"><Inp value={empresaForm.responsavel_nome} onChange={v => setEF('responsavel_nome', v)} /></Field>
                  <Field label="E-mail"><Inp value={empresaForm.responsavel_email} onChange={v => setEF('responsavel_email', v)} type="email" /></Field>
                  <Field label="WhatsApp"><Inp value={empresaForm.responsavel_whatsapp} onChange={v => setEF('responsavel_whatsapp', v)} type="tel" /></Field>
                  <Field label="Status">
                    <Sel value={empresaForm.status} onChange={v => setEF('status', v)}
                      options={STATUS_OPCOES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} />
                  </Field>
                  <Field label="Billing status">
                    <Sel value={empresaForm.billing_status} onChange={v => setEF('billing_status', v)}
                      options={BILLING_OPCOES.map(s => ({ value: s, label: s }))} />
                  </Field>
                </div>
                <Field label="Notas internas">
                  <textarea value={empresaForm.notas_internas} onChange={e => setEF('notas_internas', e.target.value)}
                    rows={2}
                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none" />
                </Field>
                <button onClick={submitEmpresa} disabled={pending || !empresaForm.nome.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40">
                  {pending ? 'Salvando...' : empresaFormMode === 'nova' ? 'Criar' : 'Salvar'}
                </button>
              </div>
            )}

            {/* Nova loja form */}
            {lojaEmpresaId && (
              <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Adicionar licença de loja</h3>
                  <button onClick={() => setLojaEmpresaId(null)} className="text-xs text-zinc-400 hover:text-zinc-700">Cancelar</button>
                </div>
                <p className="text-xs text-zinc-500">
                  Empresa/rede: <strong>{empresas.find(e => e.id === lojaEmpresaId)?.nome}</strong>
                  {' · '}<span className="text-green-700 font-medium">R${LICENCA_VALOR}/mês por loja ativa</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome da loja *"><Inp value={lojaForm.nome} onChange={v => setLojaForm(p => ({ ...p, nome: v }))} /></Field>
                  <Field label="Cidade"><Inp value={lojaForm.cidade} onChange={v => setLojaForm(p => ({ ...p, cidade: v }))} /></Field>
                  <Field label="WhatsApp"><Inp value={lojaForm.whatsapp} onChange={v => setLojaForm(p => ({ ...p, whatsapp: v }))} type="tel" /></Field>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="loja-ativa-nova" checked={lojaForm.ativa}
                      onChange={e => setLojaForm(p => ({ ...p, ativa: e.target.checked }))} className="h-4 w-4" />
                    <label htmlFor="loja-ativa-nova" className="text-sm text-zinc-700">Loja ativa</label>
                  </div>
                </div>
                <button onClick={submitLoja} disabled={pending || !lojaForm.nome.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40">
                  {pending ? 'Criando...' : 'Criar loja'}
                </button>
              </div>
            )}

            {/* Lista de empresas */}
            <div className="space-y-3">
              {empresasVisiveis.map(empresa => {
                const isExpanded = expandedId === empresa.id
                const lojasVisiveis = empresa.lojas.filter((l: LojaRow) => !l.admin_only)
                const receitaEmpresa = empresa.qtd_lojas * LICENCA_VALOR

                return (
                  <div key={empresa.id} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
                    <div className="flex items-start gap-2 justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 truncate">{empresa.nome}</p>
                        {empresa.responsavel_nome && <p className="text-sm text-zinc-500">{empresa.responsavel_nome}</p>}
                        {empresa.responsavel_email && <p className="text-xs text-zinc-400">{empresa.responsavel_email}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge value={empresa.billing_status ?? empresa.status} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-green-700 font-medium">{formatBRL(receitaEmpresa)}/mês</span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-zinc-500">{empresa.qtd_lojas} loja{empresa.qtd_lojas !== 1 ? 's' : ''} ativa{empresa.qtd_lojas !== 1 ? 's' : ''}</span>
                      {empresa.nicho && (
                        <><span className="text-zinc-300">·</span><span className="text-zinc-400 text-xs">{empresa.nicho}</span></>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setExpandedId(isExpanded ? null : empresa.id)}
                        className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-50">
                        {isExpanded ? 'Ocultar' : `Lojas (${lojasVisiveis.length})`}
                      </button>
                      <button onClick={() => abrirEditarEmpresa(empresa)}
                        className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-50">
                        Editar
                      </button>
                      <button onClick={() => { setLojaEmpresaId(empresa.id); setLojaForm({ nome: '', cidade: '', whatsapp: '', ativa: true }); setEmpresaFormMode('none') }}
                        className="text-xs bg-zinc-900 text-white rounded px-2 py-1 hover:bg-zinc-700">
                        + Licença de loja
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-zinc-100 pt-3 space-y-2">
                        {lojasVisiveis.length === 0 && <p className="text-sm text-zinc-400">Nenhuma loja.</p>}
                        {lojasVisiveis.map((l: LojaRow) => (
                          <div key={l.id} className="flex items-center justify-between text-sm py-1">
                            <div>
                              <span className="font-medium text-zinc-800">{l.nome}</span>
                              {l.cidade && <span className="text-zinc-400 text-xs ml-2">{l.cidade}</span>}
                              <span className="text-zinc-300 mx-2">·</span>
                              <span className="text-green-700 text-xs font-medium">R${LICENCA_VALOR}/mês</span>
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

        {/* ═════════════════════════════════════════════════
            TAB: Lojas / Licenças
        ═════════════════════════════════════════════════ */}
        {tab === 'lojas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                {stats.total_lojas} loja{stats.total_lojas !== 1 ? 's' : ''} ativa{stats.total_lojas !== 1 ? 's' : ''} faturáveis
                {' · '}
                <span className="text-green-700 font-medium">{formatBRL(stats.receita_estimada)}/mês estimados</span>
              </p>
            </div>

            {/* Editar loja form */}
            {lojaEditId && (
              <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Editar loja</h3>
                  <button onClick={() => setLojaEditId(null)} className="text-xs text-zinc-400 hover:text-zinc-700">Cancelar</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Nome *"><Inp value={lojaEditForm.nome} onChange={v => setLojaEditForm(p => ({ ...p, nome: v }))} /></Field>
                  <Field label="Cidade"><Inp value={lojaEditForm.cidade} onChange={v => setLojaEditForm(p => ({ ...p, cidade: v }))} /></Field>
                  <Field label="WhatsApp"><Inp value={lojaEditForm.whatsapp} onChange={v => setLojaEditForm(p => ({ ...p, whatsapp: v }))} type="tel" /></Field>
                  <div className="flex items-center gap-2 pt-5">
                    <input type="checkbox" id="loja-ativa-edit" checked={lojaEditForm.ativa}
                      onChange={e => setLojaEditForm(p => ({ ...p, ativa: e.target.checked }))} className="h-4 w-4" />
                    <label htmlFor="loja-ativa-edit" className="text-sm text-zinc-700">Loja ativa</label>
                  </div>
                </div>
                <button onClick={submitEditarLoja} disabled={pending || !lojaEditForm.nome.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40">
                  {pending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}

            <div className="space-y-2">
              {empresasVisiveis.map(empresa => {
                const lojasVisiveis = empresa.lojas.filter((l: LojaRow) => !l.admin_only)
                if (lojasVisiveis.length === 0) return null
                return (
                  <div key={empresa.id}>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide px-1 py-2">{empresa.nome}</p>
                    <div className="space-y-2">
                      {lojasVisiveis.map((l: LojaRow) => {
                        const acl = acessosPorLoja.find(a => a.loja_id === l.id)
                        const totalMembros = (acl?.membros.filter(m => m.ativo).length ?? 0) + (acl?.pendentes.length ?? 0)
                        return (
                          <div key={l.id} className="bg-white rounded-lg border border-zinc-200 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-zinc-900">{l.nome}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded ${l.ativa ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                    {l.ativa ? 'Ativa' : 'Inativa'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 flex-wrap">
                                  {l.cidade && <span>{l.cidade}</span>}
                                  {l.cidade && <span className="text-zinc-300">·</span>}
                                  <span className="text-green-700 font-medium">R${LICENCA_VALOR}/mês</span>
                                  <span className="text-zinc-300">·</span>
                                  <span>{totalMembros} acesso{totalMembros !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                                <button onClick={() => abrirEditarLoja(l)}
                                  className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-500 hover:bg-zinc-50">
                                  Editar
                                </button>
                                {l.ativa && (
                                  <button onClick={() => desativarLoja(l)} disabled={pending}
                                    className="text-xs border border-red-200 rounded px-2 py-1 text-red-600 hover:bg-red-50">
                                    Desativar
                                  </button>
                                )}
                                <button onClick={() => { setTab('acessos_loja'); setAclVinculoLojaId(l.id) }}
                                  className="text-xs bg-zinc-900 text-white rounded px-2 py-1 hover:bg-zinc-700">
                                  + Acesso
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════
            TAB: Acessos por Loja
        ═════════════════════════════════════════════════ */}
        {tab === 'acessos_loja' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              <input
                type="text" value={aclBusca} onChange={e => setAclBusca(e.target.value)}
                placeholder="Buscar loja..."
                className="border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 w-48"
              />
              <select value={aclFiltroEmpresa} onChange={e => setAclFiltroEmpresa(e.target.value)}
                className="border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                <option value="">Todas as empresas</option>
                {empresasVisiveis.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              {(aclBusca || aclFiltroEmpresa) && (
                <button onClick={() => { setAclBusca(''); setAclFiltroEmpresa('') }}
                  className="text-xs text-zinc-400 hover:text-zinc-700 px-2">
                  Limpar
                </button>
              )}
            </div>

            {aclFiltradas.length === 0 && (
              <p className="text-sm text-zinc-400 py-4">Nenhuma loja encontrada.</p>
            )}

            <div className="space-y-3">
              {aclFiltradas.map(acl => {
                const donos = acl.membros.filter(m => m.role === 'dono')
                const gerentes = acl.membros.filter(m => m.role === 'gerente')
                const vendedoras = acl.membros.filter(m => m.role === 'vendedora')
                const isOpen = aclVinculoLojaId === acl.loja_id

                return (
                  <div key={acl.loja_id} className="bg-white rounded-lg border border-zinc-200 p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-zinc-400">{acl.empresa_nome}</p>
                        <p className="font-medium text-zinc-900">{acl.loja_nome}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded ${acl.ativa ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {acl.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                        <button
                          onClick={() => setAclVinculoLojaId(isOpen ? null : acl.loja_id)}
                          className="text-xs bg-zinc-900 text-white rounded px-2 py-1 hover:bg-zinc-700">
                          {isOpen ? 'Fechar' : '+ Acesso'}
                        </button>
                      </div>
                    </div>

                    {/* Membros por role */}
                    {[
                      { label: 'Dono', items: donos },
                      { label: 'Gerentes', items: gerentes },
                      { label: 'Vendedoras', items: vendedoras },
                    ].map(({ label, items }) => items.length > 0 && (
                      <div key={label}>
                        <p className="text-xs text-zinc-400 font-medium mb-1">{label}</p>
                        <div className="space-y-1">
                          {items.map((m: MembroLoja) => (
                            <div key={m.membro_id} className="flex items-center justify-between text-sm border border-zinc-100 rounded px-3 py-1.5">
                              <span className="text-zinc-700 truncate">{m.nome ?? m.perfil_id}</span>
                              <button
                                onClick={() => toggleAcessoAcl(m.membro_id, m.ativo)}
                                disabled={pending}
                                className={`shrink-0 text-xs px-2 py-0.5 rounded ml-2 transition-colors ${
                                  m.ativo
                                    ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                                    : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-700'
                                }`}>
                                {m.ativo ? 'Ativo' : 'Inativo'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Pendentes */}
                    {acl.pendentes.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-400 font-medium mb-1">Pendentes (aguardando cadastro)</p>
                        <div className="space-y-1">
                          {acl.pendentes.map(p => (
                            <div key={p.id} className="flex items-center justify-between text-sm border border-yellow-100 bg-yellow-50 rounded px-3 py-1.5">
                              <div className="min-w-0">
                                <span className="text-zinc-700 truncate block">{p.email}</span>
                                <span className="text-xs text-zinc-400">{p.role}</span>
                              </div>
                              <Badge value="pendente" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {acl.membros.length === 0 && acl.pendentes.length === 0 && (
                      <p className="text-xs text-zinc-400">Nenhum acesso vinculado.</p>
                    )}

                    {/* Vincular acesso inline */}
                    {isOpen && (
                      <div className="border-t border-zinc-100 pt-3 space-y-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Adicionar acesso</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Field label="E-mail *">
                            <Inp value={aclEmail} onChange={setAclEmail} type="email" placeholder="usuario@email.com" />
                          </Field>
                          <Field label="Nome">
                            <Inp value={aclNome} onChange={setAclNome} placeholder="Nome completo" />
                          </Field>
                          <Field label="Papel">
                            <Sel value={aclRole} onChange={v => setAclRole(v as typeof ROLE_OPCOES[number])}
                              options={ROLE_OPCOES.map(r => ({ value: r, label: r }))} />
                          </Field>
                        </div>
                        <button
                          onClick={submitAclVinculo}
                          disabled={pending || !aclEmail.trim()}
                          className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40">
                          {pending ? 'Vinculando...' : 'Vincular'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════
            TAB: Acessos (por usuário)
        ═════════════════════════════════════════════════ */}
        {tab === 'acessos' && (
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-zinc-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800">Buscar usuário por e-mail</h3>
              <div className="flex gap-2">
                <input type="email" value={emailBusca} onChange={e => setEmailBusca(e.target.value)}
                  placeholder="usuario@email.com" onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                  className="flex-1 border border-zinc-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                <button onClick={handleBuscar} disabled={buscando || !emailBusca.trim()}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40">
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {buscaErro && <p className="text-sm text-red-600">{buscaErro}</p>}

              {usuario && (
                <div className="border-t border-zinc-100 pt-4 space-y-4">
                  <div>
                    <p className="font-medium text-zinc-900">{usuario.nome ?? '(sem nome)'}</p>
                    <p className="text-sm text-zinc-500">{usuario.email}</p>
                    {usuario.vinculos.filter(v => v.ativo).length > 1 && (
                      <span className="inline-flex items-center mt-1 text-xs bg-zinc-800 text-white px-2 py-0.5 rounded">
                        Multi-loja — {usuario.vinculos.filter(v => v.ativo).length} lojas ativas
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Vínculos</p>
                    {usuario.vinculos.length === 0 && <p className="text-sm text-zinc-400">Nenhum vínculo.</p>}
                    {usuario.vinculos.map(v => (
                      <div key={v.membro_id} className="flex items-center justify-between text-sm border border-zinc-100 rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <span className="font-medium text-zinc-800 truncate">{v.loja_nome}</span>
                          <span className="text-zinc-400 text-xs ml-2">— {v.role}</span>
                        </div>
                        <button onClick={() => toggleAcesso(v.membro_id, v.ativo)} disabled={pending}
                          className={`shrink-0 text-xs px-2 py-0.5 rounded transition-colors ${
                            v.ativo
                              ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-green-50 hover:text-green-700'
                          }`}>
                          {v.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                      </div>
                    ))}
                  </div>

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
                    <button onClick={submitVinculo} disabled={pending || !vinculoLojaId}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-zinc-700 disabled:opacity-40">
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
                        <button onClick={() => handleCancelarLiberacao(l.id)} disabled={pending}
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
        )}

      </div>
    </div>
  )
}
