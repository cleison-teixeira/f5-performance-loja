'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, Check, Plus, X, Package2, Users, Target, Calendar, FileText, Search,
} from 'lucide-react'
import { criarCampanha } from '../actions'
import type { ItemInput, ParticipanteInput, TipoCampanha, UnidadeConteudo, PeriodicidadeMeta, UnidadeMeta } from '../types'

interface ProdutoCatalogo {
  id: string
  nome: string
  preco_sugerido: number | null
  foto_url: string | null
  ciclo_recompra_dias: number | null
  recorrente: boolean
}

interface MembroLoja {
  id: string
  nome: string
  role: string
}

interface Props {
  lojaId: string
  lojaNome: string
  tipoInicial: TipoCampanha
  produtos: ProdutoCatalogo[]
  membros: MembroLoja[]
}

const PASSOS = ['Informações', 'Produtos', 'Meta', 'Participantes', 'Revisar']
const UNIDADES: UnidadeConteudo[] = ['g', 'kg', 'ml', 'L', 'unidade']
const UNIDADE_LABELS: Record<UnidadeConteudo, string> = { g: 'g', kg: 'kg', ml: 'ml', L: 'L', unidade: 'un.' }

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(raw: string): number {
  return parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0
}

function formatBRL(v: number): string {
  return v.toFixed(2).replace('.', ',')
}

export function NovaCampanhaWizard({ lojaId, lojaNome, tipoInicial, produtos, membros }: Props) {
  const router = useRouter()
  const [passo, setPasso] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Etapa 1 — Informações
  const [nome, setNome] = useState('')
  const [tipo] = useState<TipoCampanha>(tipoInicial)
  const [descricao, setDescricao] = useState('')
  const [orientacao, setOrientacao] = useState('')
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10))
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })

  // Etapa 2 — Produtos
  type ItemLocal = ItemInput & { _key: string; produto_nome: string; produto_foto_url?: string | null }
  const [itens, setItens] = useState<ItemLocal[]>([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoCatalogo | null>(null)
  const [qtdConteudo, setQtdConteudo] = useState('500')
  const [unidadeConteudo, setUnidadeConteudo] = useState<UnidadeConteudo>('g')
  const [precoCampanhaRaw, setPrecoCampanhaRaw] = useState('')
  const [precoRefRaw, setPrecoRefRaw] = useState('')
  const [cicloItem, setCicloItem] = useState('')

  // Etapa 3 — Meta
  const [metaIndividualRaw, setMetaIndividualRaw] = useState('2')
  const [metaLojaRaw, setMetaLojaRaw] = useState('')
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeMeta>('diaria')
  const [unidadeMeta] = useState<UnidadeMeta>('pacote')

  // Etapa 4 — Participantes
  const [participantes, setParticipantes] = useState<(ParticipanteInput & { _key: string })[]>([])
  const [buscaMembro, setBuscaMembro] = useState('')

  // ─── Validações por passo ─────────────────────────────────────────────────

  const erroP0 = !nome.trim() ? 'Nome obrigatório.' : !dataInicio ? 'Data início obrigatória.' : !dataFim ? 'Data fim obrigatória.' : dataFim < dataInicio ? 'Data fim deve ser após o início.' : null
  const erroP1 = itens.length === 0 ? 'Adicione pelo menos um produto.' : null

  function podeProsseguir(): boolean {
    if (passo === 0) return !erroP0
    if (passo === 1) return !erroP1
    return true
  }

  // ─── Adicionar produto ────────────────────────────────────────────────────

  const produtosNaoAdicionados = produtos.filter(
    p => !itens.find(i => i.produto_id === p.id) &&
    (buscaProduto.trim() === '' || p.nome.toLowerCase().includes(buscaProduto.toLowerCase()))
  )

  function handleSelecionarProduto(p: ProdutoCatalogo) {
    setProdutoSelecionado(p)
    setPrecoCampanhaRaw(p.preco_sugerido ? formatBRL(p.preco_sugerido) : '')
    setCicloItem(p.ciclo_recompra_dias ? String(p.ciclo_recompra_dias) : '')
  }

  function handleAdicionarItem() {
    if (!produtoSelecionado) return
    const preco = parseBRL(precoCampanhaRaw)
    if (preco <= 0) return
    const qty = parseFloat(qtdConteudo)
    if (!qty || qty <= 0) return

    setItens(prev => [
      ...prev,
      {
        _key: `${Date.now()}`,
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        produto_foto_url: produtoSelecionado.foto_url ?? null,
        quantidade_conteudo: qty,
        unidade_conteudo: unidadeConteudo,
        preco_campanha: preco,
        preco_referencia: precoRefRaw ? parseBRL(precoRefRaw) : null,
        ciclo_recompra_dias: cicloItem ? parseInt(cicloItem) : null,
        ordem: itens.length,
      },
    ])

    setProdutoSelecionado(null)
    setBuscaProduto('')
    setPrecoCampanhaRaw('')
    setPrecoRefRaw('')
    setCicloItem('')
    setQtdConteudo('500')
    setUnidadeConteudo('g')
  }

  function handleRemoverItem(key: string) {
    setItens(prev => prev.filter(i => i._key !== key))
  }

  // ─── Adicionar participante ───────────────────────────────────────────────

  const membrosNaoAdicionados = membros.filter(
    m => !participantes.find(p => p.perfil_id === m.id) &&
    (buscaMembro.trim() === '' || m.nome.toLowerCase().includes(buscaMembro.toLowerCase()))
  )

  function handleAdicionarParticipante(m: MembroLoja) {
    setParticipantes(prev => [
      ...prev,
      {
        _key: `${Date.now()}`,
        perfil_id: m.id,
        nome: m.nome,
        meta_individual: metaIndividualRaw ? parseFloat(metaIndividualRaw) : null,
      },
    ])
  }

  function handleRemoverParticipante(key: string) {
    setParticipantes(prev => prev.filter(p => p._key !== key))
  }

  // ─── Submeter ─────────────────────────────────────────────────────────────

  function handleSubmit(publicar: boolean) {
    startTransition(async () => {
      const res = await criarCampanha({
        lojaId,
        campanha: {
          nome: nome.trim(),
          tipo,
          descricao: descricao.trim() || null,
          orientacao_equipe: orientacao.trim() || null,
          data_inicio: dataInicio,
          data_fim: dataFim,
          meta_individual: metaIndividualRaw ? parseFloat(metaIndividualRaw) : null,
          meta_loja: metaLojaRaw ? parseFloat(metaLojaRaw) : null,
          periodicidade,
          unidade_meta: unidadeMeta,
        },
        itens: itens.map(({ _key: _k, produto_nome: _n, ...rest }) => rest),
        participantes: participantes.map(({ _key: _k, ...rest }) => rest),
      })

      if (!res.ok) {
        alert(res.error)
        return
      }

      if (publicar && res.id) {
        // Ativar imediatamente após criar
        const { atualizarStatusCampanha } = await import('../actions')
        await atualizarStatusCampanha(res.id, lojaId, 'ativa')
      }

      router.push(res.id ? `/campanhas/${res.id}` : '/campanhas')
    })
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-accent">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Nova Campanha</h1>
          <p className="text-xs text-muted-foreground">{lojaNome}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {PASSOS.map((label, idx) => (
          <div key={idx} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                ${idx < passo ? 'bg-primary text-primary-foreground' : idx === passo ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'}`}>
                {idx < passo ? <Check className="h-3 w-3" /> : idx + 1}
              </div>
              <span className={`text-[9px] font-medium ${idx === passo ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
            {idx < PASSOS.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-3 ${idx < passo ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Conteúdo por passo */}
      <div className="rounded-xl border bg-card p-5 space-y-4">

        {/* ─── Passo 0: Informações ─────────────────────────────────────────── */}
        {passo === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Informações da campanha</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Nome da campanha <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Ação do Granel — Pacotes de 500 g"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Início <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Fim <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={dataFim}
                    min={dataInicio}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Orientação para a equipe (opcional)</label>
                <textarea
                  value={orientacao}
                  onChange={e => setOrientacao(e.target.value)}
                  rows={3}
                  placeholder="Ex: Esses pacotes saem com valor mais vantajoso do que comprar a mesma quantidade no granel. Mostre a economia ao cliente."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição interna (opcional)</label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  rows={2}
                  placeholder="Contexto interno da campanha..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Passo 1: Produtos ────────────────────────────────────────────── */}
        {passo === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package2 className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Produtos participantes</h2>
            </div>

            {/* Itens adicionados */}
            {itens.length > 0 && (
              <div className="space-y-2">
                {itens.map(item => (
                  <div key={item._key} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="w-8 h-8 rounded-md bg-muted shrink-0 overflow-hidden">
                      {item.produto_foto_url ? (
                        <img src={item.produto_foto_url} alt={item.produto_nome} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{item.produto_nome}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.quantidade_conteudo} {UNIDADE_LABELS[item.unidade_conteudo]} · {fmtBRL(item.preco_campanha)}
                        {item.ciclo_recompra_dias ? ` · recompra em ${item.ciclo_recompra_dias}d` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleRemoverItem(item._key)} className="p-1 hover:text-red-500 text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar produto */}
            {!produtoSelecionado ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selecione um produto participante:</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={buscaProduto}
                    onChange={e => setBuscaProduto(e.target.value)}
                    placeholder="Buscar produto..."
                    className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border bg-background p-1">
                  {produtosNaoAdicionados.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {buscaProduto ? 'Nenhum produto encontrado.' : 'Todos os produtos já foram adicionados.'}
                    </p>
                  ) : (
                    produtosNaoAdicionados.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelecionarProduto(p)}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-md bg-muted shrink-0 overflow-hidden">
                          {p.foto_url ? (
                            <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{p.nome}</p>
                          {p.preco_sugerido && (
                            <p className="text-[10px] text-muted-foreground">{fmtBRL(p.preco_sugerido)}</p>
                          )}
                        </div>
                        <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-primary/5 border-primary/30 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {produtoSelecionado.foto_url && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                        <img src={produtoSelecionado.foto_url} alt={produtoSelecionado.nome} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    )}
                    <p className="text-xs font-semibold text-primary truncate">{produtoSelecionado.nome}</p>
                  </div>
                  <button onClick={() => setProdutoSelecionado(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Qtd. da apresentação</label>
                    <input
                      type="number"
                      min="0.001"
                      step="any"
                      value={qtdConteudo}
                      onChange={e => setQtdConteudo(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Unidade</label>
                    <select
                      value={unidadeConteudo}
                      onChange={e => setUnidadeConteudo(e.target.value as UnidadeConteudo)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{UNIDADE_LABELS[u]}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Preço da campanha <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={precoCampanhaRaw}
                      onChange={e => setPrecoCampanhaRaw(e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted-foreground mb-1">Preço de referência (opcional)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={precoRefRaw}
                      onChange={e => setPrecoRefRaw(e.target.value)}
                      placeholder="0,00"
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">Ciclo de recompra em dias (opcional)</label>
                  <input
                    type="number"
                    min="1"
                    value={cicloItem}
                    onChange={e => setCicloItem(e.target.value)}
                    placeholder={produtoSelecionado.ciclo_recompra_dias ? String(produtoSelecionado.ciclo_recompra_dias) : 'Ex: 30'}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <button
                  onClick={handleAdicionarItem}
                  disabled={!precoCampanhaRaw || parseBRL(precoCampanhaRaw) <= 0 || !qtdConteudo || parseFloat(qtdConteudo) <= 0}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  Adicionar produto
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Passo 2: Meta ─────────────────────────────────────────────────── */}
        {passo === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Meta da campanha</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Periodicidade da meta</label>
                <div className="flex gap-2">
                  {(['diaria', 'total'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriodicidade(p)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        periodicidade === p ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                      }`}
                    >
                      {p === 'diaria' ? 'Por dia' : 'Total no período'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Meta individual {periodicidade === 'diaria' ? '/ dia' : 'no período'} (pacotes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={metaIndividualRaw}
                    onChange={e => setMetaIndividualRaw(e.target.value)}
                    placeholder="Ex: 2"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Meta da equipe {periodicidade === 'diaria' ? '/ dia' : 'no período'} (opcional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={metaLojaRaw}
                    onChange={e => setMetaLojaRaw(e.target.value)}
                    placeholder="Ex: 6"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Exemplo</p>
                <p className="text-xs text-foreground/70">
                  Cada pacote vendido conta como <strong>1 unidade</strong> na meta.
                  {metaIndividualRaw && ` Cada vendedor tem meta de ${metaIndividualRaw} pacote${parseInt(metaIndividualRaw) !== 1 ? 's' : ''} ${periodicidade === 'diaria' ? 'por dia' : 'no período'}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Passo 3: Participantes ───────────────────────────────────────── */}
        {passo === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Participantes</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Selecione quem vai participar. Vendas de SKUs da campanha por não-participantes ainda serão contabilizadas no total, mas sem meta individual.
            </p>

            {/* Participantes adicionados */}
            {participantes.length > 0 && (
              <div className="space-y-1.5">
                {participantes.map(p => (
                  <div key={p._key} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{p.nome}</p>
                      {p.meta_individual != null && (
                        <p className="text-[10px] text-muted-foreground">Meta: {p.meta_individual} pacotes</p>
                      )}
                    </div>
                    <button onClick={() => handleRemoverParticipante(p._key)} className="p-1 hover:text-red-500 text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Adicionar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={buscaMembro}
                  onChange={e => setBuscaMembro(e.target.value)}
                  placeholder="Buscar membro da equipe..."
                  className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border bg-background p-1">
                {membrosNaoAdicionados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {buscaMembro ? 'Nenhum membro encontrado.' : 'Todos já foram adicionados.'}
                  </p>
                ) : (
                  membrosNaoAdicionados.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleAdicionarParticipante(m)}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent text-left transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{m.nome}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                      </div>
                      <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Passo 4: Revisão ────────────────────────────────────────────── */}
        {passo === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Revisar e publicar</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Campanha</p>
                <p className="font-semibold">{nome}</p>
                <p className="text-xs text-muted-foreground">
                  {dataInicio} → {dataFim} · Meta {metaIndividualRaw || '—'} pacote(s)/{periodicidade === 'diaria' ? 'dia' : 'período'}
                </p>
                {orientacao && (
                  <p className="text-xs text-muted-foreground italic mt-1">"{orientacao}"</p>
                )}
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {itens.length} produto{itens.length !== 1 ? 's' : ''} participante{itens.length !== 1 ? 's' : ''}
                </p>
                {itens.map(item => (
                  <div key={item._key} className="flex items-center justify-between text-xs">
                    <span className="truncate">{item.produto_nome} · {item.quantidade_conteudo} {UNIDADE_LABELS[item.unidade_conteudo]}</span>
                    <span className="font-semibold shrink-0 ml-2">{fmtBRL(item.preco_campanha)}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {participantes.length} participante{participantes.length !== 1 ? 's' : ''}
                </p>
                {participantes.map(p => (
                  <p key={p._key} className="text-xs">{p.nome}</p>
                ))}
                {participantes.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum participante selecionado. As vendas serão contabilizadas, mas sem meta individual.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={isPending}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isPending ? 'Salvando…' : 'Salvar rascunho'}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={isPending}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Ativando…' : 'Ativar campanha'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navegação entre passos */}
      {passo < 4 && (
        <div className="flex gap-2">
          {passo > 0 && (
            <button
              onClick={() => setPasso(p => p - 1)}
              className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors flex items-center justify-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          <button
            onClick={() => setPasso(p => p + 1)}
            disabled={!podeProsseguir()}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {passo === 3 ? 'Revisar' : 'Continuar'} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Erro de validação */}
      {passo === 0 && erroP0 && nome && (
        <p className="text-xs text-red-600 text-center">{erroP0}</p>
      )}
      {passo === 1 && erroP1 && (
        <p className="text-xs text-red-600 text-center">{erroP1}</p>
      )}
    </div>
  )
}
