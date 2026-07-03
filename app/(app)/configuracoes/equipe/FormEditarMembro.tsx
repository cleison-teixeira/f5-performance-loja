'use client'
import { useState } from 'react'
import { editarMembro } from './actions'
import type { MembroExibido } from './page'
import { formatarWhatsapp, normalizarWhatsapp } from '@/lib/whatsapp/mask'

interface Props {
  membro: MembroExibido
  loja_id: string
  callerRole: string
  onSalvo: (atualizado: MembroExibido) => void
  onCancelar: () => void
}

const inputClass =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const ROLES: { value: 'dono' | 'gerente' | 'vendedora'; label: string }[] = [
  { value: 'dono', label: 'Dono' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'vendedora', label: 'Vendedora' },
]

export function FormEditarMembro({ membro, loja_id, callerRole, onSalvo, onCancelar }: Props) {
  const [nome, setNome] = useState(membro.nome)
  const [telefone, setTelefone] = useState(membro.telefone)
  const [role, setRole] = useState<'dono' | 'gerente' | 'vendedora'>(membro.role as 'dono' | 'gerente' | 'vendedora')
  const [ativo, setAtivo] = useState(membro.ativo)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // gerente tem as mesmas permissões do dono na loja — todas as funções disponíveis
  const rolesDisponiveis = ROLES

  async function handleSalvar() {
    if (!nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    setSalvando(true)
    setErro(null)
    const res = await editarMembro({
      membro_id: membro.membro_id,
      loja_id,
      perfil_id: membro.perfil_id,
      nome: nome.trim(),
      telefone: normalizarWhatsapp(telefone),
      role,
      ativo,
    })
    setSalvando(false)
    if (res.ok) {
      onSalvo({
        ...membro,
        nome: nome.trim(),
        telefone: normalizarWhatsapp(telefone),
        role,
        ativo,
      })
    } else {
      setErro(res.erro ?? 'Erro ao salvar')
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <p className="text-sm font-semibold">Editar membro</p>

      <div className="space-y-3">
        {/* Nome */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome completo"
            className={inputClass}
          />
        </div>

        {/* Telefone */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone (WhatsApp)</label>
          <input
            type="tel"
            inputMode="numeric"
            value={formatarWhatsapp(normalizarWhatsapp(telefone))}
            onChange={e => setTelefone(normalizarWhatsapp(e.target.value))}
            placeholder="(XX) XXXXX-XXXX"
            className={inputClass}
          />
        </div>

        {/* Função */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Função</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as 'dono' | 'gerente' | 'vendedora')}
            className={inputClass}
          >
            {rolesDisponiveis.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Ativo */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
          <button
            type="button"
            onClick={() => setAtivo(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${ativo ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ativo ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-sm text-muted-foreground">{ativo ? 'Ativo' : 'Inativo'}</span>
        </div>
      </div>

      {erro && (
        <p className="text-sm text-destructive">{erro}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
