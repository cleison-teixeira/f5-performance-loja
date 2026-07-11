'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { desativarMembro } from './actions'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'
import type { MembroExibido } from './page'

const FormAddMembro = dynamic(
  () => import('./FormAddMembro').then(m => ({ default: m.FormAddMembro })),
  { ssr: false }
)
const FormEditarMembro = dynamic(
  () => import('./FormEditarMembro').then(m => ({ default: m.FormEditarMembro })),
  { ssr: false }
)

function iniciais(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

function AvatarCircle({ nome, avatar_url, size = 'sm' }: { nome: string; avatar_url: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  if (avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatar_url} alt={nome} className={`${dim} rounded-full object-cover border border-border flex-none`} />
    )
  }
  return (
    <div className={`${dim} rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground border border-border flex-none`}>
      {iniciais(nome) || '?'}
    </div>
  )
}

interface Props {
  membros: MembroExibido[]
  loja_id: string
  podeEditar: boolean
  userRole: string
  currentUserId: string
}

const roleBadge: Record<string, string> = {
  dono: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  lider: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  gerente: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  vendedora: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  admin_f5: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  loja_conta: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
}

const roleLabel: Record<string, string> = {
  dono: 'Gestor(a)',
  lider: 'Líder',
  gerente: 'Gerente',
  vendedora: 'Vendedora',
  admin_f5: 'Admin F5',
  loja_conta: 'Loja',
}

export function TabelaEquipe({ membros: membrosIniciais, loja_id, podeEditar, userRole, currentUserId }: Props) {
  const router = useRouter()
  const [membros, setMembros] = useState<MembroExibido[]>(membrosIniciais)
  const [mostraForm, setMostraForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [desativando, setDesativando] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setMembros(membrosIniciais)
  }, [membrosIniciais])

  function podeEditarMembro(_m: MembroExibido) {
    if (!podeEditar) return false
    return userRole === 'dono' || userRole === 'gerente' || userRole === 'admin_f5'
  }

  async function handleConfirmarRemocao(membro_id: string) {
    setConfirmandoId(null)
    setDesativando(membro_id)
    setErro(null)
    const res = await desativarMembro(membro_id)
    setDesativando(null)
    if (res.ok) {
      setMembros(prev => prev.filter(m => m.membro_id !== membro_id))
    } else {
      setErro(res.erro ?? 'Erro ao remover acesso')
    }
  }

  function handleSalvo(atualizado: MembroExibido) {
    setMembros(prev => prev.map(m => m.membro_id === atualizado.membro_id ? atualizado : m))
    setEditandoId(null)
  }

  function handleAdicionado() {
    setMostraForm(false)
    router.refresh()
  }

  function PinBadge({ m }: { m: MembroExibido }) {
    if (m.pin_ativo) {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          PIN ativo
        </span>
      )
    }
    if (m.tem_pin_hash) {
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
          PIN inativo
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted/50 text-muted-foreground/60">
        Sem PIN
      </span>
    )
  }

  // suppress unused warning
  void currentUserId

  return (
    <div className="space-y-4">
      {podeEditar && (
        <div>
          {!mostraForm ? (
            <button
              type="button"
              onClick={() => setMostraForm(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              + Adicionar membro
            </button>
          ) : (
            <FormAddMembro
              loja_id={loja_id}
              onSucesso={handleAdicionado}
              onCancelar={() => setMostraForm(false)}
            />
          )}
        </div>
      )}

      {erro && <p className="text-sm font-medium text-destructive">{erro}</p>}

      {/* Mobile: cards */}
      <div className="space-y-3 md:hidden">
        {membros.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
        )}
        {membros.map(m => {
          if (editandoId === m.membro_id) {
            return (
              <FormEditarMembro
                key={m.membro_id}
                membro={m}
                loja_id={loja_id}
                callerRole={userRole}
                onSalvo={handleSalvo}
                onCancelar={() => setEditandoId(null)}
              />
            )
          }
          return (
            <div key={m.membro_id} className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <AvatarCircle nome={m.nome} avatar_url={m.avatar_url} size="md" />
                  <div>
                    <p className="text-sm font-medium">{m.nome || '—'}</p>
                    {m.telefone && <p className="text-xs text-muted-foreground">{formatarWhatsapp(m.telefone)}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[m.isContaLoja ? 'loja_conta' : m.role] ?? 'bg-muted text-muted-foreground'}`}>
                    {roleLabel[m.isContaLoja ? 'loja_conta' : m.role] ?? m.role}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PinBadge m={m} />
              </div>
              {podeEditarMembro(m) && (
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditandoId(m.membro_id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </button>
                  {m.ativo && confirmandoId === m.membro_id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Remover acesso deste membro? O histórico será preservado.</span>
                      <button
                        type="button"
                        onClick={() => handleConfirmarRemocao(m.membro_id)}
                        disabled={desativando === m.membro_id}
                        className="text-xs text-destructive font-medium hover:underline disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoId(null)}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : m.ativo ? (
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(m.membro_id)}
                      disabled={desativando === m.membro_id}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      {desativando === m.membro_id ? 'Removendo…' : 'Remover acesso'}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Desktop: tabela */}
      <div className="hidden md:block rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Função</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">PIN</th>
              {podeEditar && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {membros.length === 0 && (
              <tr>
                <td colSpan={podeEditar ? 6 : 5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum membro cadastrado.
                </td>
              </tr>
            )}
            {membros.map(m => {
              if (editandoId === m.membro_id) {
                return (
                  <tr key={m.membro_id}>
                    <td colSpan={podeEditar ? 6 : 5} className="px-4 py-3">
                      <FormEditarMembro
                        membro={m}
                        loja_id={loja_id}
                        callerRole={userRole}
                        onSalvo={handleSalvo}
                        onCancelar={() => setEditandoId(null)}
                      />
                    </td>
                  </tr>
                )
              }
              return (
                <tr key={m.membro_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarCircle nome={m.nome} avatar_url={m.avatar_url} />
                      <span className="font-medium">{m.nome || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.telefone ? formatarWhatsapp(m.telefone) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[m.isContaLoja ? 'loja_conta' : m.role] ?? 'bg-muted text-muted-foreground'}`}>
                      {roleLabel[m.isContaLoja ? 'loja_conta' : m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PinBadge m={m} />
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {podeEditarMembro(m) && (
                          <button
                            type="button"
                            onClick={() => setEditandoId(m.membro_id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Editar
                          </button>
                        )}
                        {podeEditarMembro(m) && m.ativo && confirmandoId === m.membro_id ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleConfirmarRemocao(m.membro_id)}
                              disabled={desativando === m.membro_id}
                              className="text-xs text-destructive font-medium hover:underline disabled:opacity-50"
                            >
                              Confirmar remoção
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoId(null)}
                              className="text-xs text-muted-foreground hover:underline"
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : podeEditarMembro(m) && m.ativo ? (
                          <button
                            type="button"
                            onClick={() => setConfirmandoId(m.membro_id)}
                            disabled={desativando === m.membro_id}
                            className="text-xs text-destructive hover:underline disabled:opacity-50"
                          >
                            {desativando === m.membro_id ? 'Removendo…' : 'Remover acesso'}
                          </button>
                        ) : !podeEditarMembro(m) ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
