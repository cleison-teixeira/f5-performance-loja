'use client'
import { useState } from 'react'
import { salvarMetaMensal } from './actions'

export interface VendedoraMeta {
  perfil_id: string
  nome: string
  meta: {
    valor_meta: number
    comissao_base: number
    comissao_meta: number
    multiplicador: number | null
  } | null
}

interface Props {
  vendedoras: VendedoraMeta[]
  loja_id: string
  mes: string
  mesLabel: string
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full'

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface LinhaState {
  valor_meta: string
  comissao_base: string
  comissao_meta: string
  multiplicador: string
  salvando: boolean
  mensagem: { tipo: 'sucesso' | 'erro'; texto: string } | null
}

function makeEstado(meta: VendedoraMeta['meta']): LinhaState {
  return {
    valor_meta: meta ? String(meta.valor_meta) : '',
    comissao_base: meta ? String(meta.comissao_base) : '',
    comissao_meta: meta ? String(meta.comissao_meta) : '',
    multiplicador: meta?.multiplicador != null ? String(meta.multiplicador) : '',
    salvando: false,
    mensagem: null,
  }
}

export function FormMetaMensal({ vendedoras, loja_id, mes, mesLabel }: Props) {
  const [linhas, setLinhas] = useState<Record<string, LinhaState>>(
    Object.fromEntries(vendedoras.map(v => [v.perfil_id, makeEstado(v.meta)]))
  )

  function setLinha(id: string, patch: Partial<LinhaState>) {
    setLinhas(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function handleSalvar(perfil_id: string) {
    const l = linhas[perfil_id]
    if (!l) return

    const valor_meta = parseFloat(l.valor_meta)
    const comissao_base = parseFloat(l.comissao_base)
    const comissao_meta = parseFloat(l.comissao_meta)
    const multiplicador = l.multiplicador.trim() ? parseFloat(l.multiplicador) : null

    if (isNaN(valor_meta) || valor_meta <= 0) {
      setLinha(perfil_id, { mensagem: { tipo: 'erro', texto: 'Meta inválida' } })
      return
    }
    if (isNaN(comissao_base) || comissao_base < 0) {
      setLinha(perfil_id, { mensagem: { tipo: 'erro', texto: 'Comissão base inválida' } })
      return
    }
    if (isNaN(comissao_meta) || comissao_meta < 0) {
      setLinha(perfil_id, { mensagem: { tipo: 'erro', texto: 'Comissão pós-meta inválida' } })
      return
    }

    setLinha(perfil_id, { salvando: true, mensagem: null })
    const res = await salvarMetaMensal({
      loja_id,
      vendedora_id: perfil_id,
      mes,
      valor_meta,
      comissao_base,
      comissao_meta,
      multiplicador,
    })
    if (res.ok) {
      setLinha(perfil_id, { salvando: false, mensagem: { tipo: 'sucesso', texto: 'Salvo!' } })
      setTimeout(() => setLinha(perfil_id, { mensagem: null }), 3000)
    } else {
      setLinha(perfil_id, { salvando: false, mensagem: { tipo: 'erro', texto: res.erro ?? 'Erro ao salvar' } })
    }
  }

  if (vendedoras.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma vendedora cadastrada. Adicione na aba Equipe.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Metas para <span className="font-medium text-foreground">{mesLabel}</span>
      </p>

      <div className="space-y-3">
        {vendedoras.map(v => {
          const l = linhas[v.perfil_id] ?? makeEstado(v.meta)
          const base = parseFloat(l.comissao_base) || 0
          const pct = parseFloat(l.multiplicador) || 0
          const comissaoMultiplicada = pct > 0 ? base * pct : null

          return (
            <div key={v.perfil_id} className="rounded-lg border bg-card p-4 space-y-4">
              <p className="text-sm font-semibold">{v.nome}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Meta mensal (R$)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    placeholder="Ex: 20000"
                    value={l.valor_meta}
                    onChange={e => setLinha(v.perfil_id, { valor_meta: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    % antes da meta
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="Ex: 1"
                    value={l.comissao_base}
                    onChange={e => setLinha(v.perfil_id, { comissao_base: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    % após a meta
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="Ex: 2"
                    value={l.comissao_meta}
                    onChange={e => setLinha(v.perfil_id, { comissao_meta: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Multiplicador (opcional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    placeholder="Ex: 2 = dobro"
                    value={l.multiplicador}
                    onChange={e => setLinha(v.perfil_id, { multiplicador: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              {(base > 0 || comissaoMultiplicada) && (
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  {base > 0 && (
                    <p>Antes da meta: <span className="text-foreground font-medium">{base}%</span>
                      {' '}→ {formatBRL(10000 * base / 100)} para {formatBRL(10000)}</p>
                  )}
                  {comissaoMultiplicada != null && (
                    <p>Após a meta (×{pct}): <span className="text-foreground font-medium">{comissaoMultiplicada.toFixed(2)}%</span>
                      {' '}→ {formatBRL(10000 * comissaoMultiplicada / 100)} para {formatBRL(10000)}</p>
                  )}
                </div>
              )}

              {l.mensagem && (
                <p className={`text-sm font-medium ${l.mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-destructive'}`}>
                  {l.mensagem.texto}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleSalvar(v.perfil_id)}
                disabled={l.salvando}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
              >
                {l.salvando ? 'Salvando…' : 'Salvar meta'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
