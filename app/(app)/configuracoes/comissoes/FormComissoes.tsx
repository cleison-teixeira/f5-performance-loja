'use client'
import { useState } from 'react'
import { salvarComissao } from './actions'
import type { VendedoraComissao } from './page'

interface Props {
  vendedoras: VendedoraComissao[]
  loja_id: string
  podeEditar: boolean
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full min-w-0'

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface LinhaState {
  percentual: number
  salvando: boolean
  mensagem: { tipo: 'sucesso' | 'erro'; texto: string } | null
}

export function FormComissoes({ vendedoras, loja_id, podeEditar }: Props) {
  const [linhas, setLinhas] = useState<Record<string, LinhaState>>(
    Object.fromEntries(
      vendedoras.map(v => [
        v.perfil_id,
        { percentual: v.percentual, salvando: false, mensagem: null },
      ])
    )
  )

  function setLinha(perfil_id: string, patch: Partial<LinhaState>) {
    setLinhas(prev => ({
      ...prev,
      [perfil_id]: { ...prev[perfil_id], ...patch },
    }))
  }

  async function handleSalvar(perfil_id: string) {
    const linha = linhas[perfil_id]
    if (!linha) return
    setLinha(perfil_id, { salvando: true, mensagem: null })
    const res = await salvarComissao({
      loja_id,
      vendedora_id: perfil_id,
      percentual: linha.percentual,
    })
    if (res.ok) {
      setLinha(perfil_id, {
        salvando: false,
        mensagem: { tipo: 'sucesso', texto: 'Salvo!' },
      })
      setTimeout(() => setLinha(perfil_id, { mensagem: null }), 3000)
    } else {
      setLinha(perfil_id, {
        salvando: false,
        mensagem: { tipo: 'erro', texto: res.erro ?? 'Erro ao salvar' },
      })
    }
  }

  if (vendedoras.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma vendedora cadastrada nesta loja.
        Adicione vendedoras na aba Equipe.
      </p>
    )
  }

  return (
    <div className="space-y-3 pb-6">
      {vendedoras.map(v => {
        const linha = linhas[v.perfil_id] ?? { percentual: v.percentual, salvando: false, mensagem: null }
        const pct = linha.percentual
        const preview100 = 100 * (pct / 100)
        const preview200 = 200 * (pct / 100)

        if (!podeEditar) {
          return (
            <div key={v.perfil_id} className="rounded-lg border bg-card p-4 space-y-1">
              <p className="text-sm font-medium">{v.nome}</p>
              <p className="text-sm text-muted-foreground">{pct}% de comissão</p>
              <p className="text-xs text-muted-foreground">
                {formatBRL(100)} → {formatBRL(preview100)} &nbsp;|&nbsp; {formatBRL(200)} → {formatBRL(preview200)}
              </p>
            </div>
          )
        }

        return (
          <div key={v.perfil_id} className="rounded-lg border bg-card p-4 space-y-3">
            <p className="text-sm font-medium">{v.nome}</p>

            <div className="flex items-center gap-2">
              <div className="w-full max-w-[8rem]">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step={0.5}
                  value={pct}
                  onChange={e => setLinha(v.perfil_id, { percentual: parseFloat(e.target.value) || 0 })}
                  className={inputClass}
                />
              </div>
              <span className="text-sm text-muted-foreground shrink-0">%</span>
            </div>

            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{formatBRL(100)} → {formatBRL(preview100)}</p>
              <p>{formatBRL(200)} → {formatBRL(preview200)}</p>
            </div>

            {linha.mensagem && (
              <p
                className={`text-sm font-medium ${linha.mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-destructive'}`}
              >
                {linha.mensagem.texto}
              </p>
            )}

            <button
              type="button"
              onClick={() => handleSalvar(v.perfil_id)}
              disabled={linha.salvando}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 transition-colors"
            >
              {linha.salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
