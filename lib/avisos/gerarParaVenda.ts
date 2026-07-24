import { gerarAvisos, type AvisoParaInserir } from './gerador'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP } from '@/lib/mensagens/templates_padrao'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = { from: (table: string) => any }

const CONFIG_MODELOS: Record<string, number[]> = {
  'modelo_2_agrad_rec': [1, 3],
  'modelo_3_agrad_rec_oferta': [1, 3, 4],
  'modelo_3_agrad_rel_rec': [1, 2, 3],
  'modelo_4_completo': [1, 2, 3, 4],
  'modelo_5_follow_up': [1, 2, 3, 4, 5],
}

function obterOrdensPorModelo(modelo: string | null | undefined, fallbackQtd: number): number[] {
  if (modelo && CONFIG_MODELOS[modelo]) return CONFIG_MODELOS[modelo]
  switch (fallbackQtd) {
    case 1: return [3]
    case 2: return [1, 3]
    case 3: return [1, 2, 3]
    case 4: return [1, 2, 3, 4]
    case 5: return [1, 2, 3, 4, 5]
    default: return [1, 2, 3]
  }
}

export interface ItemParaGerarAviso {
  id: string
  produto_id: string | null
  produto_nome: string
  recorrente: boolean
  ciclo_recompra_dias: number | null
  qtd_mensagens?: number
  modelo_fluxo?: string | null
  categoria?: string | null
  parceiro?: string | null
}

interface Params {
  venda_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  cliente_nome: string
  vendedora_nome: string
  loja_nome: string
  data_base: string
  origem: 'venda_manual' | 'recompra'
  itens: ItemParaGerarAviso[]
  origem_recompra_id?: string
  db: DbLike
}

export interface ResultadoGerarAvisos {
  avisos: AvisoParaInserir[]
  mensagemTipo: Record<string, string>
}

export async function gerarAvisosParaVenda(params: Params): Promise<ResultadoGerarAvisos> {
  const {
    venda_id, loja_id, cliente_id, vendedora_id,
    cliente_nome, vendedora_nome, loja_nome,
    data_base, origem, itens, origem_recompra_id, db,
  } = params

  // 1. Filtrar somente itens recorrentes com produto_id
  const recorrentes = itens.filter(i => i.recorrente && i.produto_id)
  if (recorrentes.length === 0) return { avisos: [], mensagemTipo: {} }

  // 2. Eleger âncora: menor ciclo_recompra_dias (null → 30 para comparação; empate → primeiro)
  let anchorIdx = 0
  let minCiclo = recorrentes[0].ciclo_recompra_dias ?? 30
  for (let i = 1; i < recorrentes.length; i++) {
    const c = recorrentes[i].ciclo_recompra_dias ?? 30
    if (c < minCiclo) { minCiclo = c; anchorIdx = i }
  }

  const anchor = recorrentes[anchorIdx]
  const produto_id = anchor.produto_id!
  const item_venda_id = anchor.id

  // 3. Buscar mensagens do produto âncora (mesmo fluxo de seed/fallback de salvarVenda)
  let { data: mensagensData } = await db
    .from('mensagens_produto')
    .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
    .eq('produto_id', produto_id)
    .order('ordem')

  if (!mensagensData || mensagensData.length === 0) {
    const todosPadroes = [...TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP]
    await db.from('mensagens_produto').insert(todosPadroes.map((t: Record<string, unknown>) => ({ produto_id, ...t })))
    const res = await db
      .from('mensagens_produto')
      .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
      .eq('produto_id', produto_id)
      .order('ordem')
    mensagensData = res.data
  }

  // 4. Determinar ordens ativas (qtd_mensagens do item ou busca no banco)
  let qtd_mensagens = anchor.qtd_mensagens
  if (qtd_mensagens == null) {
    const { data: prodData } = await db.from('produtos').select('qtd_mensagens').eq('id', produto_id).single()
    qtd_mensagens = (prodData as { qtd_mensagens: number } | null)?.qtd_mensagens ?? 3
  }

  const ordensAtivas = obterOrdensPorModelo(anchor.modelo_fluxo, qtd_mensagens)
  const ordensExistentes = (mensagensData ?? []).map((m: { ordem: number }) => m.ordem as number)
  const ordensFaltantes = ordensAtivas.filter(o => !ordensExistentes.includes(o))

  if (ordensFaltantes.length > 0) {
    const DEFAULT_TEMPLATES_MAP: Record<number, unknown> = {
      1: TEMPLATES_PADRAO[0],
      2: TEMPLATES_PADRAO[1],
      3: TEMPLATES_PADRAO[2],
      4: TEMPLATE_OFERTA,
      5: TEMPLATE_FOLLOW_UP,
    }
    const novosTemplates = ordensFaltantes.map(ordem => {
      const padrao = DEFAULT_TEMPLATES_MAP[ordem] as { ordem: number; tipo: string; dias_apos_venda: number; texto: string }
      return { produto_id, ordem: padrao.ordem, tipo: padrao.tipo, dias_apos_venda: padrao.dias_apos_venda, texto: padrao.texto, estilo: 'clean', tipo_incentivo: 'nenhum' }
    })
    await db.from('mensagens_produto').insert(novosTemplates)
    const res = await db
      .from('mensagens_produto')
      .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
      .eq('produto_id', produto_id)
      .order('ordem')
    mensagensData = res.data
  }

  // 5. Montar lista de mensagens filtradas pelas ordens ativas
  type RawMensagem = {
    id: string; ordem: number; tipo: string; texto: string; dias_apos_venda: number
    estilo: string | null; tipo_incentivo: string | null; cupom_codigo: string | null
    desconto_percentual: number | null; desconto_valor: number | null
    beneficio_texto: string | null; validade_oferta: string | null
  }

  let mensagens = ((mensagensData ?? []) as RawMensagem[])
    .filter(m => ordensAtivas.includes(m.ordem))
    .map(m => ({
      id: m.id,
      tipo: m.tipo ?? 'agradecimento',
      texto: m.texto,
      dias_apos_venda: m.dias_apos_venda,
      estilo: m.estilo,
      tipo_incentivo: m.tipo_incentivo,
      cupom_codigo: m.cupom_codigo,
      desconto_percentual: m.desconto_percentual != null ? Number(m.desconto_percentual) : null,
      desconto_valor: m.desconto_valor != null ? Number(m.desconto_valor) : null,
      beneficio_texto: m.beneficio_texto,
      validade_oferta: m.validade_oferta,
    }))

  // FASE 3: recompra exclui agradecimento (filtro por tipo, não por ordem)
  if (origem === 'recompra') {
    mensagens = mensagens.filter(m => m.tipo !== 'agradecimento')
  }

  if (mensagens.length === 0) return { avisos: [], mensagemTipo: {} }

  // 6. Construir lista concatenada de nomes (todos os recorrentes)
  const nomesProdutos = recorrentes.map(r => r.produto_nome)
  const produto_nome_lista = nomesProdutos.length === 1
    ? nomesProdutos[0]
    : nomesProdutos.length === 2
      ? `${nomesProdutos[0]} e ${nomesProdutos[1]}`
      : `${nomesProdutos.slice(0, -1).join(', ')} e ${nomesProdutos[nomesProdutos.length - 1]}`

  // Mapa de tipo por mensagem_id para uso no caller
  const mensagemTipo: Record<string, string> = {}
  for (const m of mensagens) { mensagemTipo[m.id] = m.tipo }

  // 7. Chamar gerarAvisos uma única vez com o ciclo do âncora
  const avisos = gerarAvisos(mensagens, {
    venda_id,
    item_venda_id,
    loja_id,
    cliente_id,
    vendedora_id,
    cliente_nome,
    produto_nome: produto_nome_lista,
    produto_nome_ancora: recorrentes.length > 1 ? anchor.produto_nome : undefined,
    vendedora_nome,
    loja_nome,
    categoria: anchor.categoria ?? null,
    parceiro: anchor.parceiro ?? null,
    origem_recompra_id,
  }, data_base, minCiclo)

  return { avisos, mensagemTipo }
}
