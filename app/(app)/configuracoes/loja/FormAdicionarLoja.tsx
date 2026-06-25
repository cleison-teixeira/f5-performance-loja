'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adicionarLoja } from './actions'
import { normalizarWhatsapp, formatarWhatsapp } from '@/lib/whatsapp/mask'

interface Props {
  empresa_id: string
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full'

export function FormAdicionarLoja({ empresa_id }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  async function handleSalvar() {
    if (!nome.trim()) { setMensagem({ tipo: 'erro', texto: 'Nome da loja é obrigatório' }); return }
    setSalvando(true)
    setMensagem(null)
    const res = await adicionarLoja({ empresa_id, nome: nome.trim(), cidade: cidade.trim(), whatsapp: normalizarWhatsapp(whatsapp), email: email.trim() })
    setSalvando(false)
    if (res.ok) {
      setMensagem({ tipo: 'sucesso', texto: 'Loja criada com sucesso!' })
      setNome(''); setCidade(''); setWhatsapp(''); setEmail('')
      setTimeout(() => { setMensagem(null); setAberto(false); router.refresh() }, 1500)
    } else {
      setMensagem({ tipo: 'erro', texto: res.erro ?? 'Erro ao criar loja' })
    }
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors w-full justify-center"
      >
        + Adicionar loja
      </button>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold">Nova loja</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-nome">Nome da loja <span className="text-destructive">*</span></label>
        <input id="add-nome" type="text" value={nome} onChange={e => setNome(e.target.value)} className={inputClass} placeholder="Ex: Loja Centro" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-cidade">Cidade</label>
        <input id="add-cidade" type="text" value={cidade} onChange={e => setCidade(e.target.value)} className={inputClass} placeholder="Ex: São Paulo" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-whatsapp">WhatsApp</label>
        <input id="add-whatsapp" type="tel" inputMode="numeric" value={whatsapp} onChange={e => setWhatsapp(formatarWhatsapp(e.target.value))} className={inputClass} placeholder="(XX) XXXXX-XXXX" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="add-email">E-mail</label>
        <input id="add-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="contato@loja.com.br" />
      </div>

      {mensagem && (
        <p className={`text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-destructive'}`}>
          {mensagem.texto}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
        >
          {salvando ? 'Criando…' : 'Criar loja'}
        </button>
        <button
          type="button"
          onClick={() => { setAberto(false); setMensagem(null) }}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
