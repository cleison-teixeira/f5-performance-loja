'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { salvarProduto, salvarMensagens, desativarProduto } from './actions'
import { UploadFotoProduto } from '@/components/ui/upload-foto-produto'
import { ORDENS_POR_MODELO, MODELO_OPTIONS } from '@/lib/mensagens/modelos'
import type { ProdutoItem, MensagemSlot } from './page'

const TIPO_LABEL: Record<string, string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full min-w-0'

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(raw: string): number | null {
  const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

// ── Formulário de produto (criar / editar) ────────────────────────────────

interface FormProdutoProps {
  loja_id: string
  produto?: ProdutoItem
  onSucesso: () => void
  onCancelar: () => void
}

function FormProduto({ loja_id, produto, onSucesso, onCancelar }: FormProdutoProps) {
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [preco, setPreco] = useState(
    produto?.preco_sugerido != null
      ? produto.preco_sugerido.toFixed(2).replace('.', ',')
      : ''
  )
  const [fotoUrl, setFotoUrl] = useState<string | null>(produto?.foto_url ?? null)
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [recorrente, setRecorrente] = useState(produto?.recorrente ?? true)
  const [comissionavelRecompra, setComissionavelRecompra] = useState(produto?.comissionavel_recompra ?? true)
  const [qtdMensagens, setQtdMensagens] = useState<1 | 2 | 3 | 4>(produto?.qtd_mensagens ?? 3)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    setErro(null)
    const precoNum = parseBRL(preco)
    const res = await salvarProduto({
      loja_id,
      produto_id: produto?.id,
      nome: nome.trim(),
      preco_sugerido: precoNum,
      foto_url: fotoUrl,
      ativo,
      recorrente,
      comissionavel_recompra: comissionavelRecompra,
      qtd_mensagens: qtdMensagens,
    })
    setSalvando(false)
    if (res.ok) onSucesso()
    else setErro(res.erro ?? 'Erro ao salvar')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4 pb-6 w-full min-w-0">
      <h3 className="text-sm font-semibold">{produto ? 'Editar produto' : 'Novo produto'}</h3>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Nome *</label>
        <input
          type="text"
          required
          autoFocus
          value={nome}
          onChange={e => setNome(e.target.value)}
          className={inputClass}
          placeholder="Nome do produto"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Preço sugerido (R$)</label>
        <input
          type="text"
          inputMode="decimal"
          value={preco}
          onChange={e => setPreco(e.target.value)}
          onBlur={() => {
            const n = parseBRL(preco)
            if (n !== null) setPreco(n.toFixed(2).replace('.', ','))
          }}
          className={inputClass}
          placeholder="0,00"
        />
      </div>

      <UploadFotoProduto
        lojaId={loja_id}
        fotoAtual={fotoUrl}
        onFotoAlterada={setFotoUrl}
      />

      {/* Modelo de contato */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Modelo de contato</label>
        <div className="space-y-1.5">
          {MODELO_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer transition-colors ${
                qtdMensagens === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-input hover:bg-accent'
              }`}
            >
              <input
                type="radio"
                name="qtd_mensagens"
                value={opt.value}
                checked={qtdMensagens === opt.value}
                onChange={() => setQtdMensagens(opt.value)}
                className="mt-0.5 shrink-0 accent-primary"
              />
              <span className="text-sm">
                <span className="font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.tipos}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={ativo}
          onClick={() => setAtivo(!ativo)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ativo ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${ativo ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <span className="text-sm">{ativo ? 'Ativo' : 'Inativo'}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={recorrente}
          onClick={() => setRecorrente(!recorrente)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${recorrente ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${recorrente ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <div>
          <span className="text-sm">{recorrente ? 'Produto recorrente' : 'Produto não recorrente'}</span>
          <p className="text-xs text-muted-foreground">{recorrente ? 'Gera avisos de recompra' : 'Sem avisos de recompra'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={comissionavelRecompra}
          onClick={() => setComissionavelRecompra(!comissionavelRecompra)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${comissionavelRecompra ? 'bg-primary' : 'bg-muted'}`}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${comissionavelRecompra ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
        <div>
          <span className="text-sm">{comissionavelRecompra ? 'Comissionável na recompra' : 'Não comissionável'}</span>
          <p className="text-xs text-muted-foreground">{comissionavelRecompra ? 'Entra na base de comissão' : 'Não entra na base de comissão'}</p>
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors touch-manipulation"
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors touch-manipulation"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ── Formulário de mensagens ───────────────────────────────────────────────

interface FormMensagensProps {
  produto_id: string
  mensagensIniciais: MensagemSlot[]
  qtdMensagens: 1 | 2 | 3 | 4
  onSucesso: () => void
  onFechar: () => void
}

function FormMensagens({ produto_id, mensagensIniciais, qtdMensagens, onSucesso, onFechar }: FormMensagensProps) {
  const ordensAtivas = ORDENS_POR_MODELO[qtdMensagens]
  const slotsVisiveis = mensagensIniciais.filter(m => ordensAtivas.includes(m.ordem))
  const [mensagens, setMensagens] = useState<MensagemSlot[]>(slotsVisiveis)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  function atualizar(ordem: number, campo: 'texto' | 'dias_apos_venda', valor: string | number) {
    setMensagens(prev => prev.map(m => m.ordem === ordem ? { ...m, [campo]: valor } : m))
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    const res = await salvarMensagens({
      produto_id,
      mensagens: mensagens.map(m => ({
        ordem: m.ordem,
        tipo: m.tipo,
        texto: m.texto,
        dias_apos_venda: m.dias_apos_venda,
      })),
    })
    setSalvando(false)
    if (res.ok) {
      setSucesso(true)
      setTimeout(() => { setSucesso(false); onSucesso() }, 800)
    } else {
      setErro(res.erro ?? 'Erro ao salvar mensagens')
    }
  }

  return (
    <div className="border-t pt-4 mt-3 space-y-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Templates de mensagem ({qtdMensagens} {qtdMensagens === 1 ? 'ativo' : 'ativos'})
      </p>

      {mensagens.map(m => (
        <div key={m.ordem} className="space-y-2 rounded-md bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {m.ordem}. {TIPO_LABEL[m.tipo]}
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground">Dia</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={m.dias_apos_venda}
                onChange={e => atualizar(m.ordem, 'dias_apos_venda', parseInt(e.target.value) || 0)}
                className="w-16 rounded border border-input bg-background px-2 py-1 text-base md:text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <textarea
            value={m.texto}
            onChange={e => atualizar(m.ordem, 'texto', e.target.value)}
            rows={3}
            placeholder={
              m.tipo === 'oferta'
                ? 'Opcional. Ex: Oi {cliente_nome}! Temos uma oferta especial de {produto_nome} para você…'
                : 'Olá {cliente_nome}! Aqui é {vendedora_nome} da {loja_nome}…'
            }
            className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm resize-none ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Variáveis disponíveis: {'{cliente_nome}'}, {'{vendedora_nome}'}, {'{loja_nome}'}, {'{produto_nome}'}
      </p>

      {erro && <p className="text-sm text-destructive">{erro}</p>}
      {sucesso && <p className="text-sm text-green-600">Mensagens salvas!</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors touch-manipulation"
        >
          {salvando ? 'Salvando…' : 'Salvar mensagens'}
        </button>
        <button
          onClick={onFechar}
          disabled={salvando}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors touch-manipulation"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

// ── Lista principal ───────────────────────────────────────────────────────

interface Props {
  produtos: ProdutoItem[]
  loja_id: string
  podeEditar: boolean
}

export function ListaProdutos({ produtos, loja_id, podeEditar }: Props) {
  const router = useRouter()
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mensagensAbertaId, setMensagensAbertaId] = useState<string | null>(null)
  const [desativando, setDesativando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return produtos
    return produtos.filter(p => p.nome.toLowerCase().includes(q))
  }, [produtos, busca])

  async function handleDesativar(produto_id: string) {
    setDesativando(produto_id)
    setErro(null)
    const res = await desativarProduto(produto_id)
    setDesativando(null)
    if (res.ok) router.refresh()
    else setErro(res.erro ?? 'Erro ao desativar')
  }

  function handleSucesso() {
    setMostrarFormNovo(false)
    setEditandoId(null)
    setMensagensAbertaId(null)
    router.refresh()
  }

  return (
    <div className="space-y-4 pb-8">
      {produtos.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto…"
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {podeEditar && !mostrarFormNovo && (
        <button
          onClick={() => { setMostrarFormNovo(true); setEditandoId(null) }}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Novo produto
        </button>
      )}

      {mostrarFormNovo && (
        <FormProduto
          loja_id={loja_id}
          onSucesso={handleSucesso}
          onCancelar={() => setMostrarFormNovo(false)}
        />
      )}

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {produtos.length === 0 && !mostrarFormNovo && (
        <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      )}

      {produtos.length > 0 && produtosFiltrados.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum produto encontrado para <strong>&ldquo;{busca}&rdquo;</strong>.
        </p>
      )}

      <div className="space-y-3">
        {produtosFiltrados.map(produto => {
          const ordensAtivas = ORDENS_POR_MODELO[produto.qtd_mensagens]
          const salvasAtivas = produto.mensagens.filter(m => ordensAtivas.includes(m.ordem) && m.id !== null)
          const totalAtivo = ordensAtivas.length

          return (
            <div
              key={produto.id}
              className={`rounded-lg border bg-card p-4 w-full min-w-0 transition-opacity ${!produto.ativo ? 'opacity-60' : ''}`}
            >
              {editandoId === produto.id ? (
                <FormProduto
                  loja_id={loja_id}
                  produto={produto}
                  onSucesso={handleSucesso}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {produto.foto_url ? (
                      <img src={produto.foto_url} alt={produto.nome} className="w-12 h-12 rounded-md object-cover shrink-0 border" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-muted shrink-0 flex items-center justify-center text-muted-foreground font-medium text-sm">
                        {produto.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-medium truncate">{produto.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {produto.preco_sugerido != null
                              ? formatarBRL(produto.preco_sugerido)
                              : 'Sem preço definido'}
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${produto.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {podeEditar && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pl-[3.75rem]">
                      <button
                        onClick={() => { setEditandoId(produto.id); setMensagensAbertaId(null) }}
                        className="text-xs border border-input rounded px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setMensagensAbertaId(mensagensAbertaId === produto.id ? null : produto.id)}
                        className={`text-xs border rounded px-2.5 py-1.5 transition-colors ${
                          mensagensAbertaId === produto.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        Mensagens ({salvasAtivas.length}/{totalAtivo})
                      </button>
                      {produto.ativo && (
                        <button
                          onClick={() => handleDesativar(produto.id)}
                          disabled={desativando === produto.id}
                          className="text-xs text-destructive hover:underline disabled:opacity-50 ml-auto"
                        >
                          {desativando === produto.id ? 'Desativando…' : 'Desativar'}
                        </button>
                      )}
                    </div>
                  )}

                  {mensagensAbertaId === produto.id && (
                    <FormMensagens
                      produto_id={produto.id}
                      mensagensIniciais={produto.mensagens}
                      qtdMensagens={produto.qtd_mensagens}
                      onSucesso={handleSucesso}
                      onFechar={() => setMensagensAbertaId(null)}
                    />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
