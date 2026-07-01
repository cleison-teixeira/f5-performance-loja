'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { NICHOS_OFICIAIS } from '@/lib/config/produtos-segmentos'
import type { LojaData, AssinaturaItem, LojaVinculada } from './page'
import { salvarLoja, salvarEndereco } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────

type Msg = { tipo: 'ok' | 'erro'; texto: string } | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function maskDocumento(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length === 0) return ''
  if (d.length <= 11) {
    let r = d
    if (d.length > 3) r = d.slice(0, 3) + '.' + d.slice(3)
    if (d.length > 6) r = r.slice(0, 7) + '.' + r.slice(7)
    if (d.length > 9) r = r.slice(0, 11) + '-' + r.slice(11)
    return r
  }
  let r = d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '/' + d.slice(8, 12)
  if (d.length > 12) r += '-' + d.slice(12, 14)
  return r
}

function maskWpp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function Inp({
  value, onChange, type = 'text', placeholder = '', disabled = false, readOnly = false,
}: {
  value: string; onChange?: (v: string) => void; type?: string
  placeholder?: string; disabled?: boolean; readOnly?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={`w-full border rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/50
        ${readOnly || disabled
          ? 'border-border bg-muted/50 text-muted-foreground cursor-default'
          : 'border-input bg-background focus:border-ring'
        }`}
    />
  )
}

function SectionMsg({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p className={`text-xs font-medium ${msg.tipo === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
      {msg.texto}
    </p>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    pendente:  { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pendente' },
    aplicado:  { bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    label: 'Ativo' },
    ativo:     { bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',    label: 'Ativo' },
    trial:     { bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         label: 'Trial' },
    cortesia:  { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Cortesia' },
    suspenso:  { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             label: 'Suspenso' },
    cancelado: { bg: 'bg-muted text-muted-foreground',                                            label: 'Cancelado' },
  }
  const cfg = map[status] ?? { bg: 'bg-muted text-muted-foreground', label: status }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg}`}>
      {cfg.label}
    </span>
  )
}

const selectCls = 'w-full border border-input bg-background rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-default'

// ── Main Component ────────────────────────────────────────────────────────────

export function FormMinhaConta({
  emailConta,
  loja,
  todasLojas,
  podeEditar,
  assinatura,
  lojasVinculadas,
}: {
  emailConta: string
  loja: LojaData | null
  todasLojas: LojaData[]
  podeEditar: boolean
  assinatura: AssinaturaItem[]
  lojasVinculadas: LojaVinculada[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Dados da loja (card unificado)
  const [nomeLoja, setNomeLoja] = useState(loja?.nome ?? '')
  const [documento, setDocumento] = useState(maskDocumento(loja?.documento ?? ''))
  const [nicho, setNicho] = useState(loja?.nicho ?? '')
  const [emailLoja, setEmailLoja] = useState(loja?.email ?? '')
  const [whatsappLoja, setWhatsappLoja] = useState(loja?.whatsapp ?? '')
  const [msgLoja, setMsgLoja] = useState<Msg>(null)

  // Endereço
  const [cidade, setCidade] = useState(loja?.cidade ?? '')
  const [endereco, setEndereco] = useState(loja?.endereco ?? '')
  const [msgEndereco, setMsgEndereco] = useState<Msg>(null)

  function showMsg(setter: (m: Msg) => void, tipo: 'ok' | 'erro', texto: string) {
    setter({ tipo, texto })
    setTimeout(() => setter(null), 5000)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleSalvarLoja() {
    if (!loja) return
    if (!nomeLoja.trim()) return showMsg(setMsgLoja, 'erro', 'Nome da loja obrigatório.')
    startTransition(async () => {
      const res = await salvarLoja({
        loja_id: loja.id,
        nome: nomeLoja,
        documento: documento.replace(/\D/g, '') ? documento : '',
        nicho,
        loja_email: emailLoja,
        loja_whatsapp: whatsappLoja,
      })
      if (res.ok) { showMsg(setMsgLoja, 'ok', 'Dados da loja salvos.'); router.refresh() }
      else showMsg(setMsgLoja, 'erro', res.erro ?? 'Erro ao salvar.')
    })
  }

  function handleSalvarEndereco() {
    if (!loja) return
    startTransition(async () => {
      const res = await salvarEndereco({ loja_id: loja.id, cidade, endereco })
      if (res.ok) { showMsg(setMsgEndereco, 'ok', 'Endereço salvo.'); router.refresh() }
      else showMsg(setMsgEndereco, 'erro', res.erro ?? 'Erro ao salvar.')
    })
  }

  const btnPrimary = 'bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors'
  const card = 'rounded-xl border border-border bg-card p-5 space-y-5'

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja?.nome ?? ''}</p>
        {todasLojas.length > 1 && (
          <p className="text-xs text-muted-foreground mt-1">
            Editando <span className="font-medium">{loja?.nome}</span>.{' '}
            <a href="/configuracoes/loja" className="underline underline-offset-2 hover:text-foreground transition-colors">
              Outras unidades →
            </a>
          </p>
        )}
      </div>

      {!loja && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm text-muted-foreground">Nenhuma loja encontrada para sua conta.</p>
        </div>
      )}

      {loja && (
        <>
          {/* 1. Dados da loja (unificado) */}
          <section className={card}>
            <h2 className="text-sm font-semibold text-foreground">Dados da loja</h2>

            <div className="space-y-4">
              <Field label="Nome da loja">
                <Inp value={nomeLoja} onChange={setNomeLoja} placeholder="Nome da loja" disabled={!podeEditar || pending} />
              </Field>

              <Field label="CNPJ / CPF" hint="CPF: 000.000.000-00 · CNPJ: 00.000.000/0000-00">
                <Inp
                  value={documento}
                  onChange={v => setDocumento(maskDocumento(v))}
                  placeholder="000.000.000-00"
                  disabled={!podeEditar || pending}
                />
              </Field>

              <Field label="Nicho / Segmento">
                <select
                  value={nicho}
                  onChange={e => setNicho(e.target.value)}
                  disabled={!podeEditar || pending}
                  className={selectCls}
                >
                  <option value="">Selecionar nicho...</option>
                  {NICHOS_OFICIAIS.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>

              <div className="border-t border-border/50 pt-4 space-y-4">
                <Field label="E-mail da conta" hint="Não é possível alterar o e-mail de login por aqui.">
                  <Inp value={emailConta} readOnly />
                </Field>

                <Field label="E-mail da loja">
                  <Inp value={emailLoja} onChange={setEmailLoja} type="email" placeholder="contato@loja.com.br" disabled={!podeEditar || pending} />
                </Field>

                <Field label="WhatsApp da loja">
                  <Inp value={whatsappLoja} onChange={v => setWhatsappLoja(maskWpp(v))} type="tel" placeholder="(48) 99999-9999" disabled={!podeEditar || pending} />
                </Field>
              </div>
            </div>

            {podeEditar && (
              <div className="flex items-center gap-3">
                <button onClick={handleSalvarLoja} disabled={pending} className={btnPrimary}>
                  {pending ? 'Salvando...' : 'Salvar dados'}
                </button>
                <SectionMsg msg={msgLoja} />
              </div>
            )}
          </section>

          {/* 2. Endereço */}
          <section className={card}>
            <h2 className="text-sm font-semibold text-foreground">Endereço</h2>

            <div className="space-y-4">
              <Field label="Cidade">
                <Inp value={cidade} onChange={setCidade} placeholder="Ex: Florianópolis" disabled={!podeEditar || pending} />
              </Field>

              <Field label="Endereço">
                <Inp value={endereco} onChange={setEndereco} placeholder="Rua, número, bairro..." disabled={!podeEditar || pending} />
              </Field>

              <div className="rounded-md border border-border/50 bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Endereço completo com CEP, número, bairro e estado será liberado em breve.
                </p>
              </div>
            </div>

            {podeEditar && (
              <div className="flex items-center gap-3">
                <button onClick={handleSalvarEndereco} disabled={pending} className={btnPrimary}>
                  {pending ? 'Salvando...' : 'Salvar endereço'}
                </button>
                <SectionMsg msg={msgEndereco} />
              </div>
            )}
          </section>

          {/* 3. Assinatura */}
          <section className={card}>
            <h2 className="text-sm font-semibold text-foreground">Assinatura</h2>

            {assinatura.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma informação de assinatura encontrada.</p>
            ) : (
              <div className="space-y-3">
                {assinatura.map(a => (
                  <div key={a.id} className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
                    {a.tipo === 'loja' ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">F5 Recompra Loja</p>
                            <p className="text-xs text-muted-foreground">{a.loja_nome ?? 'Licença de loja'}</p>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-0.5">Tipo</p>
                            <p className="font-medium text-foreground">Licença de loja</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">Valor</p>
                            <p className="font-medium text-foreground">
                              {a.valor_pago != null ? `R$${Number(a.valor_pago).toLocaleString('pt-BR')}/mês` : 'R$149/mês'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">Liberado em</p>
                            <p className="font-medium text-foreground">{formatDate(a.criado_em)}</p>
                          </div>
                          {a.aplicado_em && (
                            <div>
                              <p className="text-muted-foreground mb-0.5">Ativado em</p>
                              <p className="font-medium text-foreground">{formatDate(a.aplicado_em)}</p>
                            </div>
                          )}
                          {a.prazo_acesso && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground mb-0.5">Trial até</p>
                              <p className="font-medium text-foreground">{formatDate(a.prazo_acesso)}</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Acesso brinde multi-lojas</p>
                            <p className="text-xs text-muted-foreground">Sem cobrança adicional</p>
                          </div>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-0.5">Tipo</p>
                            <p className="font-medium text-foreground">Acesso brinde</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">Liberado em</p>
                            <p className="font-medium text-foreground">{formatDate(a.criado_em)}</p>
                          </div>
                        </div>
                        {lojasVinculadas.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground">Lojas vinculadas</p>
                            <div className="flex flex-wrap gap-1.5">
                              {lojasVinculadas.map(lv => (
                                <span key={lv.id} className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                                  {lv.nome}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Para alterar plano ou cancelar, entre em contato com o suporte F5.
            </p>
          </section>
        </>
      )}

      {/* Sessão */}
      <section className={card}>
        <h2 className="text-sm font-semibold text-foreground">Sessão</h2>
        <p className="text-sm text-muted-foreground">
          Use esta opção apenas se quiser encerrar o acesso neste dispositivo.
        </p>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </section>

    </div>
  )
}
