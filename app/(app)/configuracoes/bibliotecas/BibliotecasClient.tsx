'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Package, X, CheckCircle2, BookOpen, GraduationCap, Clock, ArrowRight, Loader2 } from 'lucide-react'
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

const DETALHES_BIBLIOTECA = [
  'Fotos dos produtos',
  'Preços sugeridos',
  'Ciclos configurados',
  '5 avisos configurados',
]

export function BibliotecasClient({ bibliotecas, lojas, lojaId, instalados: instaladosArr, multiLoja }: Props) {
  const [instalados, setInstalados] = useState(() => new Set(instaladosArr))
  const [modalBibliotecaId, setModalBibliotecaId] = useState<string | null>(null)
  const [selectedLojas, setSelectedLojas] = useState<string[]>([])
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [isPending, startTransition] = useTransition()

  const modalBiblioteca = modalBibliotecaId
    ? bibliotecas.find(b => b.id === modalBibliotecaId) ?? null
    : null

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

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <div className="rounded-xl border bg-muted/30 p-4 md:p-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Comece por uma biblioteca de produtos parceiros. Em poucos segundos, sua loja recebe produtos com foto, preço, ciclo de recompra e mensagens prontas.
          </p>
          <Link
            href="/configuracoes/produtos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Ver produtos instalados
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* ── Seção 1: Produtos parceiros ─────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Produtos parceiros</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Catálogos prontos com foto, preço, ciclo de recompra e mensagens configuradas.
            </p>
          </div>

          {bibliotecas.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/30 p-10 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma biblioteca de parceiros disponível no momento.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bibliotecas.map(bib => {
                const instaladoCount = multiLoja ? contarLojasInstaladas(instalados, bib.id, lojas) : 0
                const instaladoNaLoja = !multiLoja && lojaId ? isInstalado(instalados, lojaId, bib.id) : false
                const todasInstaladas = multiLoja && instaladoCount === lojas.length && lojas.length > 0

                return (
                  <div key={bib.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">

                    {/* Cabeçalho do card */}
                    <div className="p-4 border-b bg-muted/20 flex items-center gap-3">
                      {bib.parceiro_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={bib.parceiro_logo}
                          alt={bib.parceiro_nome ?? bib.nome}
                          className="w-11 h-11 rounded-lg object-contain bg-background shrink-0 border"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight">{nomeDisplay(bib)}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {bib.qtd_itens > 0 && (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              {bib.qtd_itens} produto{bib.qtd_itens !== 1 ? 's' : ''}
                            </span>
                          )}
                          {bib.nicho && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
                              {bib.nicho}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Pronto para recompra
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Corpo do card */}
                    <div className="flex-1 p-4 space-y-4">
                      {bib.descricao && (
                        <p className="text-sm text-muted-foreground leading-relaxed">{bib.descricao}</p>
                      )}

                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {DETALHES_BIBLIOTECA.map(item => (
                          <li key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary/60 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Rodapé / CTA */}
                    <div className="p-4 border-t space-y-2.5">
                      {multiLoja ? (
                        todasInstaladas ? (
                          <div className="flex items-center justify-center gap-2 py-2 text-green-600 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Instalado em todas as lojas
                          </div>
                        ) : (
                          <>
                            {instaladoCount > 0 && (
                              <p className="text-xs text-center text-muted-foreground">
                                Instalada em {instaladoCount} de {lojas.length} loja{lojas.length !== 1 ? 's' : ''}
                              </p>
                            )}
                            <button
                              onClick={() => abrirModal(bib.id)}
                              disabled={isPending}
                              className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                              {instaladoCount > 0 ? 'Instalar em mais lojas' : 'Instalar produtos'}
                            </button>
                          </>
                        )
                      ) : (
                        instaladoNaLoja ? (
                          <>
                            <div className="flex items-center justify-center gap-2 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">Produtos instalados</span>
                            </div>
                            <Link
                              href="/configuracoes/produtos"
                              className="flex items-center justify-center gap-1.5 text-sm text-primary font-medium hover:underline"
                            >
                              Ver produtos
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </>
                        ) : (
                          <button
                            onClick={() => instalarSingle(bib.id)}
                            disabled={isPending}
                            className="w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Instalando…
                              </>
                            ) : (
                              'Instalar produtos'
                            )}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Seção 2: Treinamentos ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Treinamentos</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Conteúdos para treinar a equipe e padronizar a abordagem de recompra.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            {/* F5 Recompra — disponível */}
            <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-primary/5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">F5 Recompra</p>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Já disponível na F5 Academy
                  </span>
                </div>
              </div>
              <div className="flex-1 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Treinamentos padrão para usar o sistema, registrar vendas e acompanhar a Fila de Recompra.
                </p>
              </div>
              <div className="p-4 border-t">
                <Link
                  href="/treinamentos"
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-primary text-primary text-sm font-semibold py-2.5 hover:bg-primary/5 transition-colors"
                >
                  Abrir F5 Academy
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* PiùVita Treinamentos — disponível */}
            <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-primary/5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">PiùVita Treinamentos</p>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-green-50 dark:bg-green-950/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Disponível na F5 Academy
                  </span>
                </div>
              </div>
              <div className="flex-1 p-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Conteúdos específicos para vender e recomprar produtos PiùVita.
                </p>
              </div>
              <div className="p-4 border-t">
                <Link
                  href="/parceiros/piuvita"
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-primary text-primary text-sm font-semibold py-2.5 hover:bg-primary/5 transition-colors"
                >
                  Acessar portal PiùVita
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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
