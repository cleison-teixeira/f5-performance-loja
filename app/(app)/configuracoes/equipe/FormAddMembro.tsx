'use client'
import { useState } from 'react'
import { addMembro } from './actions'
import { formatarWhatsapp, normalizarWhatsapp } from '@/lib/whatsapp/mask'

interface Props {
  loja_id: string
  onSucesso: () => void
  onCancelar: () => void
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full'

export function FormAddMembro({ loja_id, onSucesso, onCancelar }: Props) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [role, setRole] = useState<'dono' | 'gerente' | 'vendedora'>('vendedora')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return

    const digits = normalizarWhatsapp(telefone)
    if (digits.length < 10 || digits.length > 11) {
      setErro('Informe um WhatsApp válido para cadastrar o membro.')
      return
    }

    setSalvando(true)
    setErro(null)
    const res = await addMembro({ loja_id, nome: nome.trim(), telefone: digits, role, comissao: 0 })
    setSalvando(false)
    if (res.ok) {
      onSucesso()
    } else {
      setErro(res.erro ?? 'Erro ao adicionar membro')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4 mt-2">
      <h3 className="text-sm font-semibold">Adicionar membro</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-nome">Nome *</label>
        <input
          id="add-nome"
          type="text"
          required
          value={nome}
          onChange={e => setNome(e.target.value)}
          className={inputClass}
          placeholder="Nome completo"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-telefone">WhatsApp *</label>
        <input
          id="add-telefone"
          type="tel"
          inputMode="numeric"
          value={formatarWhatsapp(normalizarWhatsapp(telefone))}
          onChange={e => setTelefone(normalizarWhatsapp(e.target.value))}
          className={inputClass}
          placeholder="(48) 99999-9999"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-role">Função</label>
        <select
          id="add-role"
          value={role}
          onChange={e => setRole(e.target.value as 'dono' | 'gerente' | 'vendedora')}
          className={inputClass}
        >
          <option value="vendedora">Vendedora</option>
          <option value="gerente">Gerente</option>
          <option value="dono">Dono</option>
        </select>
      </div>

      {erro && (
        <p className="text-sm font-medium text-destructive">{erro}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          {salvando ? 'Adicionando…' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
