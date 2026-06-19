'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { desativarMembro } from './actions'
import { FormAddMembro } from './FormAddMembro'
import { FormEditarMembro } from './FormEditarMembro'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'
import type { MembroExibido } from './page'

interface Props {
  membros: MembroExibido[]
  loja_id: string
  podeEditar: boolean
  userRole: string
  currentUserId: string
}

const roleBadge: Record<string, string> = {
  dono: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  gerente: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  vendedora: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  admin_f5: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

const roleLabel: Record<string, string> = {
  dono: 'Dono',
  gerente: 'Gerente',
  vendedora: 'Vendedora',
  admin_f5: 'Admin F5',
}

export function TabelaEquipe({ membros: membrosIniciais, loja_id, podeEditar, userRole, currentUserId }: Props) {
  const router = useRouter()
  const [membros, setMembros] = useState<MembroExibido[]>(membrosIniciais)
  const [mostraForm, setMostraForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [desativando, setDesativando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function podeEditarMembro(m: MembroExibido) {
    if (!podeEditar) return false
    if (m.perfil_id === currentUserId) return false
    if (userRole === 'dono' || userRole === 'admin_f5') return true
    if (userRole === 'gerente') return m.role === 'vendedora'
    return false
  }

  async function handleDesativar(membro_id: string) {
    setDesativando(membro_id)
    setErro(null)
    const res = await desativarMembro(membro_id)
    setDesativando(null)
    if (res.ok) {
      setMembros(prev => prev.map(m => m.membro_id === membro_id ? { ...m, ativo: false } : m))
    } else {
      setErro(res.erro ?? 'Erro ao desativar membro')
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

      {erro && (
        <p className="text-sm font-medium text-destructive">{erro}</p>
      )}

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
                <div>
                  <p className="text-sm font-medium">{m.nome || '—'}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[m.role] ?? 'bg-muted text-muted-foreground'}`}>
                    {roleLabel[m.role] ?? m.role}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              {m.telefone && (
                <p className="text-xs text-muted-foreground">{formatarWhatsapp(m.telefone)}</p>
              )}
              {m.role === 'vendedora' && (
                <p className="text-xs text-muted-foreground">
                  Comissão: <span className="font-medium text-foreground">{m.percentual_comissao}%</span>
                </p>
              )}
              {podeEditarMembro(m) && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditandoId(m.membro_id)}
                    className="text-xs text-primary hover:underline"
                  >
                    Editar
                  </button>
                  {m.ativo && (
                    <button
                      type="button"
                      onClick={() => handleDesativar(m.membro_id)}
                      disabled={desativando === m.membro_id}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      {desativando === m.membro_id ? 'Desativando…' : 'Desativar'}
                    </button>
                  )}
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Comissão</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Função</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              {podeEditar && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {membros.length === 0 && (
              <tr>
                <td colSpan={podeEditar ? 7 : 6} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum membro cadastrado.
                </td>
              </tr>
            )}
            {membros.map(m => {
              if (editandoId === m.membro_id) {
                return (
                  <tr key={m.membro_id}>
                    <td colSpan={podeEditar ? 7 : 6} className="px-4 py-3">
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
                  <td className="px-4 py-3 font-medium">{m.nome || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.telefone ? formatarWhatsapp(m.telefone) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.role === 'vendedora' ? `${m.percentual_comissao}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge[m.role] ?? 'bg-muted text-muted-foreground'}`}>
                      {roleLabel[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {podeEditar && (
                    <td className="px-4 py-3">
                      {podeEditarMembro(m) ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setEditandoId(m.membro_id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Editar
                          </button>
                          {m.ativo && (
                            <button
                              type="button"
                              onClick={() => handleDesativar(m.membro_id)}
                              disabled={desativando === m.membro_id}
                              className="text-xs text-destructive hover:underline disabled:opacity-50"
                            >
                              {desativando === m.membro_id ? 'Desativando…' : 'Desativar'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
