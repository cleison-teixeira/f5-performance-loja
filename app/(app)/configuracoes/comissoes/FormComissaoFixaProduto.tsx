'use client'
import { useState } from 'react'
import { Plus, X, Trash2 } from 'lucide-react'
import { salvarComissaoFixaProduto, atualizarComissaoFixaProduto, excluirComissaoFixaProduto } from './actions'

export interface RegraFixa {
  id: string
  produto_id: string
  produto_nome: string
  vendedora_id: string
  vendedora_nome: string
  valor_fixo: number
  ativo: boolean
}

interface Props {
  regras: RegraFixa[]
  produtos: { id: string; nome: string }[]
  vendedoras: { id: string; nome: string }[]
  loja_id: string
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full min-w-0'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface LinhaEstado {
  valor_fixo: string
  ativo: boolean
  salvando: boolean
  excluindo: boolean
  mensagem: { tipo: 'sucesso' | 'erro'; texto: string } | null
}

interface NovaRegraState {
  produto_id: string
  vendedora_id: string
  valor_fixo: string
  salvando: boolean
  erro: string | null
}

export function FormComissaoFixaProduto({ regras: regrasInicio, produtos, vendedoras, loja_id }: Props) {
  const [regras, setRegras] = useState<RegraFixa[]>(regrasInicio)
  const [linhas, setLinhas] = useState<Record<string, LinhaEstado>>(
    Object.fromEntries(
      regrasInicio.map(r => [r.id, { valor_fixo: String(r.valor_fixo), ativo: r.ativo, salvando: false, excluindo: false, mensagem: null }])
    )
  )
  const [adicionando, setAdicionando] = useState(false)
  const [nova, setNova] = useState<NovaRegraState>({
    produto_id: '',
    vendedora_id: '',
    valor_fixo: '',
    salvando: false,
    erro: null,
  })

  function setLinha(id: string, patch: Partial<LinhaEstado>) {
    setLinhas(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function handleSalvarLinha(id: string) {
    const l = linhas[id]
    if (!l) return
    const valor_fixo = parseFloat(l.valor_fixo)
    if (isNaN(valor_fixo) || valor_fixo < 0) {
      setLinha(id, { mensagem: { tipo: 'erro', texto: 'Valor inválido' } })
      return
    }
    setLinha(id, { salvando: true, mensagem: null })
    const res = await atualizarComissaoFixaProduto({ id, valor_fixo, ativo: l.ativo })
    if (res.ok) {
      setRegras(prev => prev.map(r => r.id === id ? { ...r, valor_fixo, ativo: l.ativo } : r))
      setLinha(id, { salvando: false, mensagem: { tipo: 'sucesso', texto: 'Salvo!' } })
      setTimeout(() => setLinha(id, { mensagem: null }), 3000)
    } else {
      setLinha(id, { salvando: false, mensagem: { tipo: 'erro', texto: res.erro ?? 'Erro' } })
    }
  }

  async function handleAdicionar() {
    const valor_fixo = parseFloat(nova.valor_fixo)
    if (!nova.produto_id) return setNova(p => ({ ...p, erro: 'Selecione um produto' }))
    if (!nova.vendedora_id) return setNova(p => ({ ...p, erro: 'Selecione uma vendedora' }))
    if (isNaN(valor_fixo) || valor_fixo < 0) return setNova(p => ({ ...p, erro: 'Valor inválido' }))

    const jáExiste = regras.some(r => r.produto_id === nova.produto_id && r.vendedora_id === nova.vendedora_id)
    if (jáExiste) return setNova(p => ({ ...p, erro: 'Já existe uma regra para este produto e vendedora' }))

    setNova(p => ({ ...p, salvando: true, erro: null }))
    const res = await salvarComissaoFixaProduto({ loja_id, produto_id: nova.produto_id, vendedora_id: nova.vendedora_id, valor_fixo })

    if (res.ok && res.id) {
      const prod = produtos.find(p => p.id === nova.produto_id)
      const vend = vendedoras.find(v => v.id === nova.vendedora_id)
      const novaRegra: RegraFixa = {
        id: res.id,
        produto_id: nova.produto_id,
        produto_nome: prod?.nome ?? '—',
        vendedora_id: nova.vendedora_id,
        vendedora_nome: vend?.nome ?? '—',
        valor_fixo,
        ativo: true,
      }
      setRegras(prev => [...prev, novaRegra])
      setLinhas(prev => ({ ...prev, [res.id!]: { valor_fixo: String(valor_fixo), ativo: true, salvando: false, excluindo: false, mensagem: null } }))
      setNova({ produto_id: '', vendedora_id: '', valor_fixo: '', salvando: false, erro: null })
      setAdicionando(false)
    } else {
      setNova(p => ({ ...p, salvando: false, erro: res.erro ?? 'Erro ao salvar' }))
    }
  }

  async function handleExcluir(id: string, nome: string, vendedora: string) {
    if (!confirm(`Excluir regra de comissão fixa para "${nome}" / ${vendedora}?`)) return
    setLinha(id, { excluindo: true, mensagem: null })
    const res = await excluirComissaoFixaProduto(id)
    if (res.ok) {
      setRegras(prev => prev.filter(r => r.id !== id))
    } else {
      setLinha(id, { excluindo: false, mensagem: { tipo: 'erro', texto: res.erro ?? 'Erro ao excluir' } })
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <p className="text-sm text-muted-foreground">
        Valor fixo em R$ por recompra confirmada, independente do percentual.
      </p>

      {regras.length === 0 && !adicionando && (
        <p className="text-sm text-muted-foreground italic">Nenhuma regra cadastrada.</p>
      )}

      {regras.length > 0 && (
        <div className="space-y-3">
          {regras.map(r => {
            const l = linhas[r.id]
            if (!l) return null
            return (
              <div key={r.id} className={`rounded-lg border bg-card p-4 space-y-3 transition-opacity ${!l.ativo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{r.produto_nome}</p>
                    <p className="text-xs text-muted-foreground">{r.vendedora_nome}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs text-muted-foreground">{l.ativo ? 'Ativo' : 'Inativo'}</span>
                    <div
                      onClick={() => setLinha(r.id, { ativo: !l.ativo })}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${l.ativo ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${l.ativo ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-muted-foreground shrink-0">R$</span>
                  <div className="w-full max-w-[9rem] min-w-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={l.valor_fixo}
                      onChange={e => setLinha(r.id, { valor_fixo: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">por recompra</span>
                </div>

                {l.mensagem && (
                  <p className={`text-sm font-medium ${l.mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-destructive'}`}>
                    {l.mensagem.texto}
                  </p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSalvarLinha(r.id)}
                    disabled={l.salvando || l.excluindo}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
                  >
                    {l.salvando ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExcluir(r.id, r.produto_nome, r.vendedora_nome)}
                    disabled={l.salvando || l.excluindo}
                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {l.excluindo ? 'Excluindo…' : 'Excluir'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {adicionando ? (
        <div className="rounded-lg border border-dashed bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Nova regra</p>
            <button
              type="button"
              onClick={() => { setAdicionando(false); setNova(p => ({ ...p, erro: null })) }}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Produto</label>
              <select
                value={nova.produto_id}
                onChange={e => setNova(p => ({ ...p, produto_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Selecionar produto…</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vendedora</label>
              <select
                value={nova.vendedora_id}
                onChange={e => setNova(p => ({ ...p, vendedora_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Selecionar vendedora…</option>
                {vendedoras.map(v => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor fixo (R$)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                placeholder="Ex: 10.00"
                value={nova.valor_fixo}
                onChange={e => setNova(p => ({ ...p, valor_fixo: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          {nova.erro && (
            <p className="text-sm text-destructive">{nova.erro}</p>
          )}

          <button
            type="button"
            onClick={handleAdicionar}
            disabled={nova.salvando}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
          >
            {nova.salvando ? 'Salvando…' : 'Adicionar regra'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdicionando(true)}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-input px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar regra
        </button>
      )}
    </div>
  )
}
