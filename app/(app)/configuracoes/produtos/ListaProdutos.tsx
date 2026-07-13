'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { salvarProduto, salvarMensagens, desativarProduto } from './actions'
import { normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'
import { UploadFotoProduto } from '@/components/ui/upload-foto-produto'
import { ORDENS_POR_MODELO, MODELO_OPTIONS } from '@/lib/mensagens/modelos'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP, getTextosParaEstiloEIncentivo } from '@/lib/mensagens/templates_padrao'
import type { ProdutoItem, MensagemSlot } from './page'
import { NICHOS_OFICIAIS, getCategoriasDoNicho } from '@/lib/config/produtos-segmentos'

const TIPO_LABEL: Record<string, string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
  follow_up: 'Confirmação',
}

const inputClass =
  'rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-full min-w-0'

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBRL(raw: string): number | null {
  if (raw == null || raw === '') return null
  const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

// ── Formulário de produto (criar / editar) ────────────────────────────────

interface FormProdutoProps {
  loja_id: string
  lojaNichos: string[]
  produto?: ProdutoItem
  onSucesso: () => void
  onCancelar: () => void
}

function FormProduto({ loja_id, lojaNichos, produto, onSucesso, onCancelar }: FormProdutoProps) {
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [preco, setPreco] = useState(
    produto?.preco_sugerido != null
      ? produto.preco_sugerido.toFixed(2).replace('.', ',')
      : ''
  )
  const [fotoUrl, setFotoUrl] = useState<string | null>(produto?.foto_url ?? null)
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [recorrente, setRecorrente] = useState(produto?.recorrente ?? true)
  const [qtdMensagens, setQtdMensagens] = useState<1 | 2 | 3 | 4 | 5>(produto?.qtd_mensagens ?? 5)
  
  const nichosHabilitados = lojaNichos.length > 0 ? lojaNichos : ['Outros']
  const defaultNicho = produto?.nicho ?? (nichosHabilitados.length === 1 ? nichosHabilitados[0] : '')
  const [nicho, setNicho] = useState(defaultNicho)
  const [parceiro, setParceiro] = useState(produto?.parceiro ?? '')
  const [categoria, setCategoria] = useState(produto?.categoria ?? '')

  const isNichoLegado = nicho !== '' && !NICHOS_OFICIAIS.includes(nicho as any)
  const categoriasValidas = getCategoriasDoNicho(nicho)
  const isCategoriaLegada = categoria !== '' && !categoriasValidas.includes(categoria)
  const isLegado = isNichoLegado || isCategoriaLegada

  const nichoOptions = Array.from(new Set([...nichosHabilitados, ...(produto?.nicho ? [produto.nicho] : [])]))
  const categoriaOptions = Array.from(new Set([...categoriasValidas, ...(produto?.categoria ? [produto.categoria] : [])]))

  function handleNichoChange(novoNicho: string) {
    setNicho(novoNicho)
    const novasCategorias = getCategoriasDoNicho(novoNicho)
    setCategoria(novasCategorias.includes('Outros') ? 'Outros' : (novasCategorias[0] ?? ''))
  }
  const [galeriaRaw, setGaleriaRaw] = useState(produto?.galeria_urls?.join(', ') ?? '')
  const [variantesRaw, setVariantesRaw] = useState(produto?.variantes?.join(', ') ?? '')
  
  // Extract initial ciclo from product messages (type = 'recompra')
  const msgRecompra = produto?.mensagens?.find(m => m.tipo === 'recompra')
  const [ciclo, setCiclo] = useState<number>(msgRecompra?.dias_apos_venda ?? 30)

  // Message and layout states
  const msgReferencia = produto?.mensagens?.find(m => m.estilo != null) || produto?.mensagens?.[0]
  const [estilo, setEstilo] = useState<string>(msgReferencia?.estilo ?? 'clean')
  const [tipoIncentivo, setTipoIncentivo] = useState<string>(msgReferencia?.tipo_incentivo ?? 'nenhum')
  const [cupomCodigo, setCupomCodigo] = useState<string>(msgReferencia?.cupom_codigo ?? '')
  const [descontoPercentual, setDescontoPercentual] = useState<string>(
    msgReferencia?.desconto_percentual != null ? String(msgReferencia.desconto_percentual) : ''
  )
  const [descontoValor, setDescontoValor] = useState<string>(
    msgReferencia?.desconto_valor != null ? msgReferencia.desconto_valor.toFixed(2).replace('.', ',') : ''
  )
  const [beneficioTexto, setBeneficioTexto] = useState<string>(msgReferencia?.beneficio_texto ?? '')
  const [validadeOferta, setValidadeOferta] = useState<string>(msgReferencia?.validade_oferta ?? '')

  const defaultMensagens: MensagemSlot[] = [
    ...TEMPLATES_PADRAO.map(t => ({ id: null, ...t, estilo: 'clean', tipo_incentivo: 'nenhum', cupom_codigo: '', desconto_percentual: null, desconto_valor: null, beneficio_texto: '', validade_oferta: '' })),
    { id: null, ...TEMPLATE_OFERTA, estilo: 'clean', tipo_incentivo: 'nenhum', cupom_codigo: '', desconto_percentual: null, desconto_valor: null, beneficio_texto: '', validade_oferta: '' },
    { id: null, ...TEMPLATE_FOLLOW_UP, estilo: 'clean', tipo_incentivo: 'nenhum', cupom_codigo: '', desconto_percentual: null, desconto_valor: null, beneficio_texto: '', validade_oferta: '' }
  ]
  
  const [mensagens, setMensagens] = useState<MensagemSlot[]>(
    produto?.mensagens || defaultMensagens
  )

  // Sync offsets when cycle (ciclo) changes
  useEffect(() => {
    if (ciclo > 0) {
      setMensagens(prev => prev.map(m => {
        let offset = m.dias_apos_venda
        if (m.tipo === 'agradecimento') offset = 0
        else if (m.tipo === 'relacionamento') offset = Math.max(0, Math.floor(ciclo / 2))
        else if (m.tipo === 'recompra') offset = Math.max(Math.max(0, Math.floor(ciclo / 2)), ciclo - 5)
        else if (m.tipo === 'oferta') offset = Math.max(Math.max(Math.max(0, Math.floor(ciclo / 2)), ciclo - 5), ciclo - 1)
        else if (m.tipo === 'follow_up') {
          const of = Math.max(Math.max(Math.max(0, Math.floor(ciclo / 2)), ciclo - 5), ciclo - 1)
          offset = Math.max(of + 1, ciclo + 2)
        }
        return { ...m, dias_apos_venda: offset }
      }))
    }
  }, [ciclo])

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function handleEstiloChange(novoEstilo: string) {
    const ordensAtivas = ORDENS_POR_MODELO[qtdMensagens]
    const defaultsAtuais = getTextosParaEstiloEIncentivo(estilo, tipoIncentivo)
    const novosDefaults = getTextosParaEstiloEIncentivo(novoEstilo, tipoIncentivo)

    const temCustomizado = mensagens
      .filter(m => ordensAtivas.includes(m.ordem))
      .some(m => {
        const textoDefault = defaultsAtuais.find(d => d.ordem === m.ordem)?.texto ?? ''
        return m.texto.trim() !== '' && m.texto.trim() !== textoDefault.trim()
      })

    if (temCustomizado) {
      if (!window.confirm('Alterar o estilo pode substituir os textos atuais dos templates. Deseja aplicar o novo estilo?')) {
        return
      }
    }

    setEstilo(novoEstilo)
    setMensagens(prev => prev.map(m => {
      const novoDefault = novosDefaults.find(d => d.ordem === m.ordem)
      return novoDefault ? { ...m, texto: novoDefault.texto } : m
    }))
  }

  function handleTipoIncentivoChange(novoTipo: string) {
    const ordensAtivas = ORDENS_POR_MODELO[qtdMensagens]
    const defaultsAtuais = getTextosParaEstiloEIncentivo(estilo, tipoIncentivo)
    const novosDefaults = getTextosParaEstiloEIncentivo(estilo, novoTipo)

    // Incentivo afeta apenas slots 3, 4 e 5
    const ordensAfetadas = ordensAtivas.filter(o => o >= 3)
    const temCustomizado = mensagens
      .filter(m => ordensAfetadas.includes(m.ordem))
      .some(m => {
        const textoDefault = defaultsAtuais.find(d => d.ordem === m.ordem)?.texto ?? ''
        return m.texto.trim() !== '' && m.texto.trim() !== textoDefault.trim()
      })

    if (temCustomizado) {
      if (!window.confirm('Alterar o incentivo pode substituir os textos atuais dos templates. Deseja aplicar o novo incentivo?')) {
        return
      }
    }

    setTipoIncentivo(novoTipo)
    setMensagens(prev => prev.map(m => {
      if (!ordensAfetadas.includes(m.ordem)) return m
      const novoDefault = novosDefaults.find(d => d.ordem === m.ordem)
      return novoDefault ? { ...m, texto: novoDefault.texto } : m
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    if (recorrente && ciclo <= 0) {
      setErro('Informe o ciclo de recompra em dias (mínimo 1).')
      return
    }
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
      comissionavel_recompra: produto?.comissionavel_recompra ?? true,
      qtd_mensagens: qtdMensagens,
      nicho: nicho.trim() || null,
      parceiro: parceiro.trim() || null,
      categoria: categoria.trim() || null,
      galeria_urls: galeriaRaw.split(',').map(s => s.trim()).filter(Boolean),
      variantes: variantesRaw.split(',').map(s => s.trim()).filter(Boolean),
      ciclo: recorrente ? ciclo : null,
    })

    if (res.ok && res.produto_id) {
      const resMsg = await salvarMensagens({
        produto_id: res.produto_id,
        mensagens: mensagens.map(m => ({
          ordem: m.ordem,
          tipo: m.tipo,
          texto: m.texto,
          dias_apos_venda: m.dias_apos_venda,
          estilo: estilo,
          tipo_incentivo: tipoIncentivo,
          cupom_codigo: cupomCodigo || null,
          desconto_percentual: parseBRL(descontoPercentual),
          desconto_valor: parseBRL(descontoValor),
          beneficio_texto: beneficioTexto || null,
          validade_oferta: validadeOferta || null,
        }))
      })
      setSalvando(false)
      if (resMsg.ok) {
        onSucesso()
      } else {
        setErro(resMsg.erro ?? 'Erro ao salvar mensagens')
      }
    } else {
      setSalvando(false)
      setErro(res.erro ?? 'Erro ao salvar produto')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border bg-card p-4 pb-6 w-full min-w-0">
      <h3 className="text-sm font-semibold">{produto ? 'Editar produto' : 'Novo produto'}</h3>

      {/* BLOCO A — PRODUTO */}
      <div className="space-y-4 rounded-xl border bg-muted/5 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">BLOCO A — Configurações do Produto</h4>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nome *</label>
          <input
            type="text"
            required
            autoFocus
            value={nome}
            onChange={e => setNome(e.target.value)}
            onBlur={e => setNome(normalizarNomeProduto(e.target.value))}
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

        {isLegado && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-700 dark:text-amber-400 font-medium">
            Este produto possui classificação antiga. Selecione uma opção padronizada para atualizar.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nicho</label>
            <select
              value={nicho}
              onChange={e => handleNichoChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione o nicho</option>
              {nichoOptions.map(n => (
                <option key={n} value={n}>
                  {n} {!NICHOS_OFICIAIS.includes(n as any) ? '(Antigo/Fora do padrão)' : ''}
                </option>
              ))}
            </select>
            {lojaNichos.length === 0 && (
              <p className="text-[10px] text-amber-600 font-medium mt-0.5 leading-normal">
                Configure o nicho da loja em{' '}
                <a href="/minha-conta" className="underline">Minha Conta</a>{' '}
                para padronizar os produtos.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Parceiro (Opcional)</label>
            <input
              type="text"
              value={parceiro}
              onChange={e => setParceiro(e.target.value)}
              className={inputClass}
              placeholder="Ex: PiuVita"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Categoria</label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione a categoria</option>
            {categoriaOptions.map(c => (
              <option key={c} value={c}>
                {c} {!categoriasValidas.includes(c) ? '(Antigo/Fora do padrão)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Variantes / Apresentações</label>
          <input
            type="text"
            value={variantesRaw}
            onChange={e => setVariantesRaw(e.target.value)}
            className={inputClass}
            placeholder="Sabores ou tamanhos separados por vírgula"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Galeria de fotos (URLs separadas por vírgula)</label>
          <input
            type="text"
            value={galeriaRaw}
            onChange={e => setGaleriaRaw(e.target.value)}
            className={inputClass}
            placeholder="https://... , https://..."
          />
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

      </div>

      {/* BLOCO B — MENSAGENS E CADÊNCIA */}
      <div className="space-y-4 border-t pt-4 mt-2">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">BLOCO B — Mensagens e Cadência</h4>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Modelo de contato</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODELO_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
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
                  onChange={() => setQtdMensagens(opt.value as any)}
                  className="mt-0.5 shrink-0 accent-primary"
                />
                <span className="text-xs">
                  <span className="font-semibold block">{opt.label}</span>
                  <span className="text-[10px] text-muted-foreground">{opt.tipos}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {recorrente && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Estilo do Template</label>
                <select
                  value={estilo}
                  onChange={e => handleEstiloChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="clean">Clean (Direto)</option>
                  <option value="consultivo">Consultivo (Apoio)</option>
                  <option value="persuasivo">Persuasivo (Foco)</option>
                  <option value="incentivo">Incentivo (Benefício)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de Incentivo</label>
                <select
                  value={tipoIncentivo}
                  onChange={e => handleTipoIncentivoChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="nenhum">Nenhum</option>
                  <option value="cupom">Cupom de Desconto</option>
                  <option value="desconto_percentual">Desconto %</option>
                  <option value="desconto_valor">Desconto R$</option>
                  <option value="brinde">Brinde Especial</option>
                  <option value="condicao_especial">Condição Especial</option>
                  <option value="frete_gratis">Frete Grátis</option>
                  <option value="combo">Combo Promocional</option>
                </select>
              </div>
            </div>

            {tipoIncentivo !== 'nenhum' && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Detalhes do Incentivo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tipoIncentivo === 'cupom' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Código do Cupom</label>
                      <input
                        type="text"
                        value={cupomCodigo}
                        onChange={e => setCupomCodigo(e.target.value)}
                        placeholder="EX: RECOMPRA10"
                        className={inputClass}
                      />
                    </div>
                  )}
                  {tipoIncentivo === 'desconto_percentual' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Desconto (%)</label>
                      <input
                        type="text"
                        value={descontoPercentual}
                        onChange={e => setDescontoPercentual(e.target.value)}
                        placeholder="10"
                        className={inputClass}
                      />
                    </div>
                  )}
                  {tipoIncentivo === 'desconto_valor' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Valor do Desconto (R$)</label>
                      <input
                        type="text"
                        value={descontoValor}
                        onChange={e => setDescontoValor(e.target.value)}
                        onBlur={e => {
                          const n = parseBRL(e.target.value)
                          if (n !== null) setDescontoValor(n.toFixed(2).replace('.', ','))
                        }}
                        placeholder="15,00"
                        className={inputClass}
                      />
                    </div>
                  )}
                  {(tipoIncentivo === 'brinde' || tipoIncentivo === 'condicao_especial' || tipoIncentivo === 'combo' || tipoIncentivo === 'frete_gratis') && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-xs font-medium">Descrição do Benefício / Brinde</label>
                      <input
                        type="text"
                        value={beneficioTexto}
                        onChange={e => setBeneficioTexto(e.target.value)}
                        placeholder="Ex: Leve um sachê extra de colágeno"
                        className={inputClass}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Validade da Oferta (texto)</label>
                    <input
                      type="text"
                      value={validadeOferta}
                      onChange={e => setValidadeOferta(e.target.value)}
                      placeholder="Ex: hoje até o fim do dia"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {ciclo > 0 && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Linha do Tempo da Cadência comercial (Preview {ciclo} dias)</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• <strong>Agradecimento:</strong> hoje (D0)</div>
                  {qtdMensagens >= 2 && <div>• <strong>Relacionamento:</strong> em {Math.max(0, Math.floor(ciclo / 2))} dias</div>}
                  {qtdMensagens >= 3 && <div>• <strong>Recompra:</strong> em {Math.max(Math.max(0, Math.floor(ciclo / 2)), ciclo - 5)} dias</div>}
                  {qtdMensagens >= 4 && <div>• <strong>Oferta:</strong> em {Math.max(Math.max(Math.max(0, Math.floor(ciclo / 2)), ciclo - 5), ciclo - 1)} dias</div>}
                  {qtdMensagens === 5 && <div>• <strong>Confirmação:</strong> em {Math.max(Math.max(Math.max(Math.max(0, Math.floor(ciclo / 2)), ciclo - 5), ciclo - 1) + 1, ciclo + 2)} dias</div>}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Textos Editáveis dos Templates</p>
              {(() => {
                const ordensAtivas = ORDENS_POR_MODELO[qtdMensagens]
                const slotsEditaveis = mensagens.filter(m => ordensAtivas.includes(m.ordem))
                return slotsEditaveis.map(m => (
                  <div key={m.ordem} className="space-y-1.5 rounded-md border p-2.5 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase">
                        {m.ordem}. {TIPO_LABEL[m.tipo]}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">D{m.dias_apos_venda}</span>
                    </div>
                    <textarea
                      value={m.texto}
                      onChange={e => {
                        const txt = e.target.value
                        setMensagens(prev => prev.map(item => item.ordem === m.ordem ? { ...item, texto: txt } : item))
                      }}
                      rows={3}
                      className="w-full text-xs rounded border border-input p-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      placeholder="Digite o texto do template..."
                    />
                  </div>
                ))
              })()}
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Variáveis possíveis: <code>{"{{cliente}}"}</code>, <code>{"{{vendedora}}"}</code>, <code>{"{{loja}}"}</code>, <code>{"{{produto}}"}</code>, <code>{"{{categoria}}"}</code>, <code>{"{{parceiro}}"}</code>, <code>{"{{ciclo_dias}}"}</code>, <code>{"{{cupom}}"}</code>, <code>{"{{desconto_percentual}}"}</code>, <code>{"{{desconto_valor}}"}</code>, <code>{"{{beneficio}}"}</code>, <code>{"{{validade_oferta}}"}</code>.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Ciclo de Recompra Sugerido */}
      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-medium flex flex-col gap-0.5">
          <span>Ciclo de Recompra Sugerido (dias)</span>
          <span className="text-xs text-muted-foreground font-normal">Define em quantos dias após a venda o sistema deve gerar o aviso de recompra.</span>
        </label>
        
        <div className="flex flex-wrap items-center gap-2">
          {[30, 45, 60, 90].map(dias => (
            <button
              key={dias}
              type="button"
              disabled={!recorrente}
              onClick={() => setCiclo(dias)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                !recorrente
                  ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50'
                  : ciclo === dias
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input hover:bg-accent'
              }`}
            >
              {dias} dias
            </button>
          ))}
          
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            disabled={!recorrente}
            value={ciclo === 0 ? '' : ciclo}
            onChange={e => {
              const val = parseInt(e.target.value.replace(/\D/g, ''), 10);
              setCiclo(isNaN(val) ? 0 : val);
            }}
            className={`w-24 px-3 py-1.5 text-sm rounded-md border focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none transition-colors ${
              !recorrente
                ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50'
                : 'border-input bg-background'
            }`}
            placeholder="Dias"
          />
        </div>

        {!recorrente && (
          <p className="text-xs text-amber-600 font-medium">
            Este ciclo só gera avisos quando o produto está marcado como recorrente.
          </p>
        )}
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
  qtdMensagens: 1 | 2 | 3 | 4 | 5
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
        estilo: m.estilo,
        tipo_incentivo: m.tipo_incentivo,
        cupom_codigo: m.cupom_codigo,
        desconto_percentual: m.desconto_percentual,
        desconto_valor: m.desconto_valor,
        beneficio_texto: m.beneficio_texto,
        validade_oferta: m.validade_oferta
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={m.dias_apos_venda}
                onChange={e => atualizar(m.ordem, 'dias_apos_venda', parseInt(e.target.value.replace(/\D/g, '')) || 0)}
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
  lojaNichos?: string[]
}

export function ListaProdutos({ produtos, loja_id, podeEditar, lojaNichos = [] }: Props) {
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
          lojaNichos={lojaNichos}
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
                  lojaNichos={lojaNichos}
                  produto={produto}
                  onSucesso={handleSucesso}
                  onCancelar={() => setEditandoId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    {produto.foto_url || (produto.galeria_urls && produto.galeria_urls[0]) ? (
                      <img src={produto.foto_url || produto.galeria_urls?.[0]} alt={produto.nome} className="w-12 h-12 rounded-md object-cover shrink-0 border" />
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
                      
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {produto.categoria && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                            {produto.categoria}
                          </span>
                        )}
                        {produto.parceiro && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-400">
                            {produto.parceiro}
                          </span>
                        )}
                        {produto.nicho && (
                          <span className="inline-flex items-center rounded-full bg-cyan-100 dark:bg-cyan-900/30 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:text-cyan-400">
                            {produto.nicho}
                          </span>
                        )}
                      </div>

                      {produto.variantes && produto.variantes.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Apresentações: <span className="font-medium text-foreground">{produto.variantes.join(', ')}</span>
                        </p>
                      )}
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
