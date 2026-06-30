'use client'

import { useState, useTransition } from 'react'
import { Package, X, CheckCircle2, BookOpen, GraduationCap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { instalarBiblioteca } from './actions'
import type { BibliotecaItem } from './page'

interface Loja {
  id: string
  nome: string
}

interface Props {
  bibliotecas: BibliotecaItem[]
  lojas: Loja[]
  lojaId: string | null
  instalados: string[] // "lojaId:bibliotecaId" pairs
  multiLoja: boolean
}

interface Resultado {
  ok: boolean
  lojasInstaladas: number
  produtosInseridos: number
  produtosIgnorados: number
  erro?: string
}

function isInstalado(instalados: Set<string>, lojaId: string, bibliotecaId: string) {
  return instalados.has(`${lojaId}:${bibliotecaId}`)
}

function contarLojasInstaladas(instalados: Set<string>, bibliotecaId: string, lojas: Loja[]) {
  return lojas.filter(l => instalados.has(`${l.id}:${bibliotecaId}`)).length
}

function nomeDisplay(bib: BibliotecaItem) {
  return bib.parceiro_nome ? `${bib.parceiro_nome} Produtos` : bib.nome
}

export function BibliotecasClient({ bibliotecas, lojas, lojaId, instalados: instaladosArr, multiLoja }: Props) {
  const [instalados, setInstalados] = useState(() => new Set(instaladosArr))
  const [modalBibliotecaId, setModalBibliotecaId] = useState<string | null>(null)
  const [selectedLojas, setSelectedLojas] = useState<string[]>([])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [isPending, startTransition] = useTransition()

  const modalBiblioteca = modalBibliotecaId
    ? bibliotecas.find(b => b.id === modalBibliotecaId) ?? null
    : null

  // Check if PiùVita produtos is installed in any loja (for treinamentos status)
  const piuvitaBib = bibliotecas.find(b => b.slug === 'piuvita')
  const piuvitaInstalada = piuvitaBib
    ? lojas.some(l => instalados.has(`${l.id}:${piuvitaBib.id}`))
    : false

  function abrirModal(bibliotecaId: string) {
    setResultado(null)
    const naoInstaladas = lojas.filter(l => !instalados.has(`${l.id}:${bibliotecaId}`))
    setSelectedLojas(naoInstaladas.map(l => l.id))
    setModalBibliotecaId(bibliotecaId)
  }

  function fecharModal() {
    if (isPending) return
    setModalBibliotecaId(null)
    setSelectedLojas([])
    setResultado(null)
  }

  function toggleLoja(id: string) {
    setSelectedLojas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleTodas() {
    if (!modalBibliotecaId) return
    const naoInstaladas = lojas.filter(l => !instalados.has(`${l.id}:${modalBibliotecaId}`))
    setSelectedLojas(selectedLojas.length === naoInstaladas.length ? [] : naoInstaladas.map(l => l.id))
  }

  function instalarSingle(bibliotecaId: string) {
    if (!lojaId) return
    startTransition(async () => {
      const res = await instalarBiblioteca({ biblioteca_id: bibliotecaId, loja_ids: [lojaId] })
      if (res.ok) {
        setInstalados(prev => new Set([...prev, `${lojaId}:${bibliotecaId}`]))
      }
    })
  }

  function confirmarInstalacao() {
    if (!modalBibliotecaId || !selectedLojas.length) return
    startTransition(async () => {
      const res = await instalarBiblioteca({ biblioteca_id: modalBibliotecaId, loja_ids: selectedLojas })
      setResultado(res)
      if (res.ok) {
        setInstalados(prev => {
          const next = new Set(prev)
          selectedLojas.forEach(lid => next.add(`${lid}:${modalBibliotecaId}`))
          return next
        })
      }
    })
  }

  return (
    <>
      <div className="space-y-8">

        {/* ── Seção 1: Produtos parceiros ────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Produtos parceiros</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Catálogos prontos com foto, preço, ciclo de recompra e mensagens configuradas.
          </p>

          {bibliotecas.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma biblioteca de parceiros disponível no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bibliotecas.map(bib => {
                const instaladoCount = multiLoja ? contarLojasInstaladas(instalados, bib.id, lojas) : 0
                const instaladoNaLoja = !multiLoja && lojaId ? isInstalado(instalados, lojaId, bib.id) : false
                const todasInstaladas = multiLoja && instaladoCount === lojas.length && lojas.length > 0

                return (
                  <div key={bib.id} className="rounded-lg border bg-card p-4 flex items-start gap-4">
                    {bib.parceiro_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bib.parceiro_logo}
                        alt={bib.parceiro_nome ?? bib.nome}
                        className="w-12 h-12 rounded object-contain shrink-0 bg-muted"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <p className="font-medium text-sm">{nomeDisplay(bib)}</p>

                        {multiLoja ? (
                          todasInstaladas ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Instalado em todas
                            </span>
                          ) : (
                            <button
                              onClick={() => abrirModal(bib.id)}
                              disabled={isPending}
                              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {instaladoCount > 0 ? 'Instalar em mais lojas' : 'Instalar produtos'}
                            </button>
                          )
                        ) : (
                          instaladoNaLoja ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Produtos instalados
                            </span>
                          ) : (
                            <button
                              onClick={() => instalarSingle(bib.id)}
                              disabled={isPending}
                              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                              {isPending ? 'Instalando...' : 'Instalar produtos'}
                            </button>
                          )
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 flex-wrap">
                        {bib.qtd_itens > 0 && (
                          <span className="text-xs text-muted-foreground">{bib.qtd_itens} produto{bib.qtd_itens !== 1 ? 's' : ''}</span>
                        )}
                        {bib.nicho && (
                          <span className="text-xs text-muted-foreground capitalize">{bib.nicho}</span>
                        )}
                        {multiLoja && instaladoCount > 0 && !todasInstaladas && (
                          <span className="text-xs text-muted-foreground">
                            Instalada em {instaladoCount} de {lojas.length} loja{lojas.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {bib.descricao && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{bib.descricao}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Seção 2: Treinamentos ──────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Treinamentos</h2>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Conteúdos para capacitar a equipe e padronizar a venda recorrente.
          </p>

          <div className="space-y-3">
            {/* F5 Recompra — sempre disponível */}
            <div className="rounded-lg border bg-card p-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">F5 Recompra</p>
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Já disponível na Academia
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Treinamentos padrão da plataforma.</p>
              </div>
            </div>

            {/* PiùVita Treinamentos */}
            <div className="rounded-lg border bg-card p-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">PiùVita Treinamentos</p>
                  <span className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium shrink-0',
                    piuvitaInstalada ? 'text-muted-foreground' : 'text-muted-foreground'
                  )}>
                    <Clock className="h-3.5 w-3.5" />
                    Em breve
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Conteúdos para venda e recompra dos produtos PiùVita.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Modal multi-loja ────────────────────────────────────────────────── */}
      {modalBibliotecaId && modalBiblioteca && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={fecharModal} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[60] bg-background rounded-xl border shadow-xl max-w-md mx-auto max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div>
                <p className="font-semibold text-sm">Instalar produtos</p>
                <p className="text-xs text-muted-foreground">{nomeDisplay(modalBiblioteca)}</p>
              </div>
              <button
                onClick={fecharModal}
                disabled={isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resultado ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                {resultado.ok ? (
                  <>
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                    <p className="font-medium">Instalação concluída</p>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>{resultado.lojasInstaladas} loja{resultado.lojasInstaladas !== 1 ? 's' : ''} configurada{resultado.lojasInstaladas !== 1 ? 's' : ''}</p>
                      <p>{resultado.produtosInseridos} produto{resultado.produtosInseridos !== 1 ? 's' : ''} adicionado{resultado.produtosInseridos !== 1 ? 's' : ''}</p>
                      {resultado.produtosIgnorados > 0 && (
                        <p>{resultado.produtosIgnorados} já existia{resultado.produtosIgnorados !== 1 ? 'm' : ''} (ignorado{resultado.produtosIgnorados !== 1 ? 's' : ''})</p>
                      )}
                    </div>
                    <button
                      onClick={fecharModal}
                      className="mt-2 text-sm font-medium px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Fechar
                    </button>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-destructive">Erro na instalação</p>
                    <p className="text-sm text-muted-foreground">{resultado.erro}</p>
                    <button
                      onClick={() => setResultado(null)}
                      className="mt-2 text-sm font-medium px-4 py-2 rounded-md border hover:bg-accent transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Selecione as lojas onde deseja instalar. Produtos já existentes não serão duplicados.
                  </p>

                  {(() => {
                    const naoInstaladas = lojas.filter(l => !instalados.has(`${l.id}:${modalBibliotecaId}`))
                    const jaInstaladas = lojas.filter(l => instalados.has(`${l.id}:${modalBibliotecaId}`))

                    return (
                      <>
                        {naoInstaladas.length > 1 && (
                          <label className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent transition-colors cursor-pointer border-b pb-3 mb-1">
                            <input
                              type="checkbox"
                              checked={selectedLojas.length === naoInstaladas.length}
                              onChange={toggleTodas}
                              className="rounded"
                            />
                            <span className="text-sm font-medium">Selecionar todas</span>
                          </label>
                        )}

                        {naoInstaladas.map(loja => (
                          <label key={loja.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-accent transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedLojas.includes(loja.id)}
                              onChange={() => toggleLoja(loja.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{loja.nome}</span>
                          </label>
                        ))}

                        {jaInstaladas.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-1">
                            <p className="text-xs text-muted-foreground px-3 mb-1">Produtos já instalados</p>
                            {jaInstaladas.map(loja => (
                              <div key={loja.id} className="flex items-center gap-3 px-3 py-2 opacity-50">
                                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                <span className="text-sm">{loja.nome}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {naoInstaladas.length === 0 && (
                          <p className="text-sm text-center text-muted-foreground py-4">
                            Produtos já instalados em todas as suas lojas.
                          </p>
                        )}
                      </>
                    )
                  })()}
                </div>

                <div className="shrink-0 px-4 py-3 border-t flex gap-2 justify-end">
                  <button
                    onClick={fecharModal}
                    disabled={isPending}
                    className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarInstalacao}
                    disabled={isPending || selectedLojas.length === 0}
                    className={cn(
                      'text-sm font-medium px-4 py-1.5 rounded-md transition-colors',
                      'bg-primary text-primary-foreground hover:bg-primary/90',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isPending
                      ? 'Instalando...'
                      : `Instalar em ${selectedLojas.length} loja${selectedLojas.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
