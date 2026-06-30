'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { EmpresaRow, PlanoOption, LojaRow } from './page'
import type { UsuarioResult } from './actions'
import {
  criarEmpresa, atualizarEmpresa, criarLoja,
  buscarUsuarioPorEmail, vincularUsuario, alterarAcesso,
} from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type EmpresaForm = {
  nome: string
  responsavel_nome: string
  responsavel_whatsapp: string
  responsavel_email: string
  nicho: string
  plano_id: string
  status: string
  billing_status: string
  notas_internas: string
}

type LojaForm = { nome: string; cidade: string; whatsapp: string; ativa: boolean }
type Msg = { tipo: 'ok' | 'erro'; texto: string } | null

const STATUS_OPCOES = ['em_onboarding', 'trial', 'ativa', 'inativa']
const BILLING_OPCOES = ['trial', 'ativo', 'cancelado', 'suspenso', 'inadimplente', 'cortesia', 'parceiro']
const ROLE_OPCOES = ['dono', 'gerente', 'vendedora', 'admin_f5'] as const

const VAZIO_EMPRESA: EmpresaForm = {
  nome: '', responsavel_nome: '', responsavel_whatsapp: '', responsavel_email: '',
  nicho: '', plano_id: '', status: 'em_onboarding', billing_status: 'trial', notas_internas: '',
}
const VAZIO_LOJA: LojaForm = { nome: '', cidade: '', whatsapp: '', ativa: true }

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    ativa: 'bg-green-100 text-green-800',
    ativo: 'bg-green-100 text-green-800',
    trial: 'bg-blue-100 text-blue-800',
    em_onboarding: 'bg-yellow-100 text-yellow-800',
    inativa: 'bg-gray-100 text-gray-600',
    cancelado: 'bg-red-100 text-red-800',
    suspenso: 'bg-red-100 text-red-800',
    inadimplente: 'bg-red-100 text-red-800',
    cortesia: 'bg-purple-100 text-purple-800',
    parceiro: 'bg-indigo-100 text-indigo-800',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[value] ?? 'bg-gray-100 text-gray-600'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  )
}

function InputText({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && ' *'}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminF5Client({
  empresas,
  planos,
}: {
  empresas: EmpresaRow[]
  planos: PlanoOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Tab
  const [tab, setTab] = useState<'empresas' | 'acessos'>('empresas')

  // Empresa form
  const [empresaFormMode, setEmpresaFormMode] = useState<'none' | 'nova' | 'editar'>('none')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [empresaForm, setEmpresaForm] = useState<EmpresaForm>(VAZIO_EMPRESA)

  // Loja form
  const [lojaEmpresaId, setLojaEmpresaId] = useState<string | null>(null)
  const [lojaForm, setLojaForm] = useState<LojaForm>(VAZIO_LOJA)

  // Expand lojas
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // User search
  const [emailBusca, setEmailBusca] = useState('')
  const [usuario, setUsuario] = useState<UsuarioResult | null>(null)
  const [buscaErro, setBuscaErro] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [vinculoLojaId, setVinculoLojaId] = useState('')
  const [vinculoRole, setVinculoRole] = useState<typeof ROLE_OPCOES[number]>('vendedora')

  // Global message
  const [msg, setMsg] = useState<Msg>(null)

  function showMsg(tipo: 'ok' | 'erro', texto: string) {
    setMsg({ tipo, texto })
    setTimeout(() => setMsg(null), 4000)
  }

  // ── Empresa form ───────────────────────────────────────────────────────────

  function abrirNovaEmpresa() {
    setEmpresaForm(VAZIO_EMPRESA)
    setEmpresaFormMode('nova')
    setEditandoId(null)
    setLojaEmpresaId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function abrirEditarEmpresa(e: EmpresaRow) {
    setEmpresaForm({
      nome: e.nome,
      responsavel_nome: e.responsavel_nome ?? '',
      responsavel_whatsapp: e.responsavel_whatsapp ?? '',
      responsavel_email: e.responsavel_email ?? '',
      nicho: e.nicho ?? '',
      plano_id: e.plano_id ?? '',
      status: e.status,
      billing_status: e.billing_status ?? 'trial',
      notas_internas: e.notas_internas ?? '',
    })
    setEmpresaFormMode('editar')
    setEditandoId(e.id)
    setLojaEmpresaId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function fecharEmpresaForm() {
    setEmpresaFormMode('none')
    setEditandoId(null)
  }

  function setEmpresaField(field: keyof EmpresaForm, value: string) {
    setEmpresaForm(prev => ({ ...prev, [field]: value }))
  }

  function submitEmpresa() {
    startTransition(async () => {
      if (empresaFormMode === 'nova') {
        const res = await criarEmpresa(empresaForm)
        if (res.ok) {
          showMsg('ok', 'Empresa criada com sucesso.')
          fecharEmpresaForm()
          router.refresh()
        } else {
          showMsg('erro', res.erro ?? 'Erro ao criar empresa.')
        }
      } else if (empresaFormMode === 'editar' && editandoId) {
        const res = await atualizarEmpresa({ id: editandoId, ...empresaForm })
        if (res.ok) {
          showMsg('ok', 'Empresa atualizada.')
          fecharEmpresaForm()
          router.refresh()
        } else {
          showMsg('erro', res.erro ?? 'Erro ao atualizar empresa.')
        }
      }
    })
  }

  // ── Loja form ──────────────────────────────────────────────────────────────

  function abrirNovaLoja(empresaId: string) {
    setLojaEmpresaId(empresaId)
    setLojaForm(VAZIO_LOJA)
    setEmpresaFormMode('none')
    setEditandoId(null)
  }

  function fecharLojaForm() {
    setLojaEmpresaId(null)
  }

  function submitLoja() {
    if (!lojaEmpresaId) return
    startTransition(async () => {
      const res = await criarLoja({ empresa_id: lojaEmpresaId, ...lojaForm })
      if (res.ok) {
        showMsg('ok', 'Loja criada com sucesso.')
        setExpandedId(lojaEmpresaId)
        fecharLojaForm()
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao criar loja.')
      }
    })
  }

  // ── User search ────────────────────────────────────────────────────────────

  async function handleBuscar() {
    if (!emailBusca.trim()) return
    setBuscando(true)
    setBuscaErro(null)
    setUsuario(null)
    const res = await buscarUsuarioPorEmail(emailBusca)
    setBuscando(false)
    if (res.ok && res.usuario) {
      setUsuario(res.usuario)
      setVinculoLojaId('')
      setVinculoRole('vendedora')
    } else {
      setBuscaErro(res.erro ?? 'Usuário não encontrado.')
    }
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
      if (res.ok) {
        showMsg('ok', 'Usuário vinculado com sucesso.')
        await refreshUsuario()
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao vincular.')
      }
    })
  }

  function toggleAcesso(membro_id: string, ativo: boolean) {
    startTransition(async () => {
      const res = await alterarAcesso(membro_id, !ativo)
      if (res.ok) {
        await refreshUsuario()
        router.refresh()
      } else {
        showMsg('erro', res.erro ?? 'Erro ao alterar acesso.')
      }
    })
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const todasLojas: Array<{ id: string; label: string }> = empresas.flatMap(e =>
    e.lojas
      .filter((l: LojaRow) => l.ativa)
      .map((l: LojaRow) => ({ id: l.id, label: `${e.nome} → ${l.nome}` }))
  )

  const planoOpcoes = [
    { value: '', label: 'Selecione um plano' },
    ...planos.map(p => ({
      value: p.id,
      label: `${p.nome}${p.max_lojas != null ? ` (até ${p.max_lojas} loja${p.max_lojas > 1 ? 's' : ''})` : ' (sem limite)'}`,
    })),
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Global message */}
      {msg && (
        <div className={`rounded-md px-4 py-3 text-sm border ${msg.tipo === 'ok'
          ? 'bg-green-50 text-green-800 border-green-200'
          : 'bg-destructive/10 text-destructive border-destructive/20'
        }`}>
          {msg.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {(['empresas', 'acessos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'empresas' ? 'Empresas' : 'Acessos'}
          </button>
        ))}
      </div>

      {/* ───────── TAB: Empresas ───────── */}
      {tab === 'empresas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{empresas.length} empresa(s)</p>
            {empresaFormMode === 'none' && lojaEmpresaId === null ? (
              <button
                onClick={abrirNovaEmpresa}
                className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
              >
                + Nova Empresa
              </button>
            ) : (
              <button
                onClick={() => { fecharEmpresaForm(); fecharLojaForm() }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            )}
          </div>

          {/* ── Formulário empresa ── */}
          {empresaFormMode !== 'none' && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <h2 className="text-sm font-semibold">
                {empresaFormMode === 'nova' ? 'Nova empresa / rede' : 'Editar empresa'}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputText label="Nome da empresa / rede" value={empresaForm.nome} onChange={v => setEmpresaField('nome', v)} required />
                <InputText label="Nicho" value={empresaForm.nicho} onChange={v => setEmpresaField('nicho', v)} />
                <InputText label="Responsável" value={empresaForm.responsavel_nome} onChange={v => setEmpresaField('responsavel_nome', v)} />
                <InputText label="WhatsApp" value={empresaForm.responsavel_whatsapp} onChange={v => setEmpresaField('responsavel_whatsapp', v)} type="tel" />
                <InputText label="E-mail" value={empresaForm.responsavel_email} onChange={v => setEmpresaField('responsavel_email', v)} type="email" />
                <SelectField
                  label="Plano"
                  value={empresaForm.plano_id}
                  onChange={v => setEmpresaField('plano_id', v)}
                  options={planoOpcoes}
                />
                <SelectField
                  label="Status"
                  value={empresaForm.status}
                  onChange={v => setEmpresaField('status', v)}
                  options={STATUS_OPCOES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
                />
                <SelectField
                  label="Billing status"
                  value={empresaForm.billing_status}
                  onChange={v => setEmpresaField('billing_status', v)}
                  options={BILLING_OPCOES.map(s => ({ value: s, label: s }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas internas</label>
                <textarea
                  value={empresaForm.notas_internas}
                  onChange={e => setEmpresaField('notas_internas', e.target.value)}
                  rows={2}
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <button
                onClick={submitEmpresa}
                disabled={pending || !empresaForm.nome.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {pending
                  ? 'Salvando...'
                  : empresaFormMode === 'nova' ? 'Criar empresa' : 'Salvar alterações'}
              </button>
            </div>
          )}

          {/* ── Formulário loja ── */}
          {lojaEmpresaId && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Nova loja</h2>
                <button onClick={fecharLojaForm} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Empresa: <strong>{empresas.find(e => e.id === lojaEmpresaId)?.nome}</strong>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputText label="Nome da loja" value={lojaForm.nome} onChange={v => setLojaForm(prev => ({ ...prev, nome: v }))} required />
                <InputText label="Cidade" value={lojaForm.cidade} onChange={v => setLojaForm(prev => ({ ...prev, cidade: v }))} />
                <InputText label="WhatsApp" value={lojaForm.whatsapp} onChange={v => setLojaForm(prev => ({ ...prev, whatsapp: v }))} type="tel" />
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="loja-ativa"
                    checked={lojaForm.ativa}
                    onChange={e => setLojaForm(prev => ({ ...prev, ativa: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="loja-ativa" className="text-sm">Loja ativa</label>
                </div>
              </div>

              <button
                onClick={submitLoja}
                disabled={pending || !lojaForm.nome.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {pending ? 'Criando...' : 'Criar loja'}
              </button>
            </div>
          )}

          {/* ── Lista de empresas ── */}
          <div className="space-y-3">
            {empresas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma empresa cadastrada.
              </p>
            )}

            {empresas.map(empresa => {
              const isExpanded = expandedId === empresa.id
              const isAtLimit =
                empresa.plano_max_lojas !== null &&
                empresa.qtd_lojas >= empresa.plano_max_lojas
              const isEditing =
                editandoId === empresa.id && empresaFormMode === 'editar'

              return (
                <div
                  key={empresa.id}
                  className={`border rounded-lg p-4 space-y-3 transition-colors ${isEditing ? 'border-primary/40 bg-primary/5' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-start gap-2 justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{empresa.nome}</p>
                      {empresa.responsavel_nome && (
                        <p className="text-sm text-muted-foreground">{empresa.responsavel_nome}</p>
                      )}
                      {empresa.responsavel_email && (
                        <p className="text-xs text-muted-foreground">{empresa.responsavel_email}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge value={empresa.status} />
                      {empresa.billing_status && empresa.billing_status !== empresa.status && (
                        <StatusBadge value={empresa.billing_status} />
                      )}
                    </div>
                  </div>

                  {/* Plano + Lojas */}
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-muted-foreground">{empresa.plano_nome ?? 'Sem plano'}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={isAtLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                      {empresa.qtd_lojas} / {empresa.plano_max_lojas != null ? empresa.plano_max_lojas : '∞'} lojas
                    </span>
                    {isAtLimit && (
                      <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">
                        Limite atingido
                      </span>
                    )}
                    {empresa.nicho && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground text-xs">{empresa.nicho}</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : empresa.id)}
                      className="text-xs border rounded px-2 py-1 text-muted-foreground hover:bg-accent transition-colors"
                    >
                      {isExpanded ? 'Ocultar' : `Lojas (${empresa.lojas.length})`}
                    </button>
                    <button
                      onClick={() => abrirEditarEmpresa(empresa)}
                      className="text-xs border rounded px-2 py-1 text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Editar
                    </button>
                    {isAtLimit ? (
                      <button
                        onClick={() => abrirEditarEmpresa(empresa)}
                        className="text-xs bg-primary/10 text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/20 transition-colors"
                      >
                        Fazer upgrade
                      </button>
                    ) : (
                      <button
                        onClick={() => abrirNovaLoja(empresa.id)}
                        className="text-xs border rounded px-2 py-1 text-muted-foreground hover:bg-accent transition-colors"
                      >
                        + Loja
                      </button>
                    )}
                  </div>

                  {/* Lojas expandidas */}
                  {isExpanded && (
                    <div className="border-t pt-3 space-y-2">
                      {empresa.lojas.length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>
                      )}
                      {empresa.lojas.map((l: LojaRow) => (
                        <div key={l.id} className="flex items-center justify-between text-sm py-1">
                          <div>
                            <span className="font-medium">{l.nome}</span>
                            {l.cidade && (
                              <span className="text-muted-foreground text-xs ml-2">{l.cidade}</span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${l.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {l.ativa ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notas */}
                  {empresa.notas_internas && (
                    <p className="text-xs text-muted-foreground border-t pt-2 italic">
                      {empresa.notas_internas}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ───────── TAB: Acessos ───────── */}
      {tab === 'acessos' && (
        <div className="space-y-5">
          {/* Search */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Buscar usuário por e-mail</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailBusca}
                onChange={e => setEmailBusca(e.target.value)}
                placeholder="usuario@email.com"
                onKeyDown={e => e.key === 'Enter' && handleBuscar()}
                className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleBuscar}
                disabled={buscando || !emailBusca.trim()}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {buscando ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {buscaErro && <p className="text-sm text-destructive">{buscaErro}</p>}
          </div>

          {/* Resultado */}
          {usuario && (
            <div className="border rounded-lg p-4 space-y-4">
              {/* Info */}
              <div>
                <p className="font-medium">{usuario.nome ?? '(sem nome)'}</p>
                <p className="text-sm text-muted-foreground">{usuario.email}</p>
              </div>

              {/* Vínculos existentes */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Vínculos atuais
                </p>
                {usuario.vinculos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum vínculo.</p>
                )}
                {usuario.vinculos.map(v => (
                  <div
                    key={v.membro_id}
                    className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="font-medium truncate">{v.loja_nome}</span>
                      <span className="text-muted-foreground text-xs ml-2">— {v.role}</span>
                    </div>
                    <button
                      onClick={() => toggleAcesso(v.membro_id, v.ativo)}
                      disabled={pending}
                      className={`shrink-0 text-xs px-2 py-0.5 rounded transition-colors ${
                        v.ativo
                          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Nova vinculação */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Adicionar vínculo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Loja</label>
                    <select
                      value={vinculoLojaId}
                      onChange={e => setVinculoLojaId(e.target.value)}
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Selecione a loja</option>
                      {todasLojas.map(l => (
                        <option key={l.id} value={l.id}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Papel</label>
                    <select
                      value={vinculoRole}
                      onChange={e => setVinculoRole(e.target.value as typeof ROLE_OPCOES[number])}
                      className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {ROLE_OPCOES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={submitVinculo}
                  disabled={pending || !vinculoLojaId}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {pending ? 'Vinculando...' : 'Vincular'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
