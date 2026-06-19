'use client'
import { useState } from 'react'
import { salvarLoja } from './actions'
import { normalizarWhatsapp, formatarWhatsapp } from '@/lib/whatsapp/mask'

interface Props {
  empresa: { id: string; nome: string }
  loja: {
    id: string
    nome: string
    cidade: string
    endereco: string
    whatsapp: string
    email: string
    ativa: boolean
  }
  podeEditar: boolean
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full'

export function FormLoja({ empresa, loja, podeEditar }: Props) {
  const [empresaNome, setEmpresaNome] = useState(empresa.nome)
  const [lojaNome, setLojaNome] = useState(loja.nome)
  const [cidade, setCidade] = useState(loja.cidade)
  const [endereco, setEndereco] = useState(loja.endereco)
  const [whatsapp, setWhatsapp] = useState(formatarWhatsapp(loja.whatsapp))
  const [email, setEmail] = useState(loja.email)
  const [ativa, setAtiva] = useState(loja.ativa)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  async function handleSalvar() {
    setSalvando(true)
    setMensagem(null)
    const res = await salvarLoja({
      empresa_id: empresa.id,
      empresa_nome: empresaNome,
      loja_id: loja.id,
      loja_nome: lojaNome,
      cidade,
      endereco,
      whatsapp: normalizarWhatsapp(whatsapp),
      email,
      ativa,
    })
    setSalvando(false)
    if (res.ok) {
      setMensagem({ tipo: 'sucesso', texto: 'Dados salvos com sucesso!' })
      setTimeout(() => setMensagem(null), 3000)
    } else {
      setMensagem({ tipo: 'erro', texto: res.erro ?? 'Erro ao salvar' })
    }
  }

  if (!podeEditar) {
    return (
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empresa</p>
          <p className="text-sm">{empresa.nome}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Loja</p>
          <p className="text-sm">{loja.nome}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cidade</p>
          <p className="text-sm">{loja.cidade || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Endereço</p>
          <p className="text-sm">{loja.endereco || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">WhatsApp</p>
          <p className="text-sm">{loja.whatsapp ? formatarWhatsapp(loja.whatsapp) : '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mail</p>
          <p className="text-sm">{loja.email || '—'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
          <p className="text-sm">{loja.ativa ? 'Ativa' : 'Inativa'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="empresa-nome">Empresa</label>
        <input
          id="empresa-nome"
          type="text"
          value={empresaNome}
          onChange={e => setEmpresaNome(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="loja-nome">Loja</label>
        <input
          id="loja-nome"
          type="text"
          value={lojaNome}
          onChange={e => setLojaNome(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="cidade">Cidade</label>
        <input
          id="cidade"
          type="text"
          value={cidade}
          onChange={e => setCidade(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="endereco">Endereço</label>
        <input
          id="endereco"
          type="text"
          value={endereco}
          onChange={e => setEndereco(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="whatsapp">WhatsApp</label>
        <input
          id="whatsapp"
          type="tel"
          inputMode="numeric"
          placeholder="(XX) XXXXX-XXXX"
          value={whatsapp}
          onChange={e => setWhatsapp(formatarWhatsapp(e.target.value))}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          E-mail <span className="text-muted-foreground font-normal">(obrigatório)</span>
        </label>
        <input
          id="email"
          type="email"
          required
          placeholder="contato@loja.com.br"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={ativa}
          onClick={() => setAtiva(!ativa)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${ativa ? 'bg-primary' : 'bg-muted'}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${ativa ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
        <label className="text-sm font-medium">{ativa ? 'Loja ativa' : 'Loja inativa'}</label>
      </div>

      {mensagem && (
        <p className={`text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-destructive'}`}>
          {mensagem.texto}
        </p>
      )}

      <button
        type="button"
        onClick={handleSalvar}
        disabled={salvando}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
      >
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
