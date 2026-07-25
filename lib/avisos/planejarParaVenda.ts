import { gerarAvisos, type AvisoParaInserir } from './gerador'

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

export interface ItemParaPlanejamento {
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
  itens: ItemParaPlanejamento[]
  origem_recompra_id?: string
  db: DbLike
}

// Pure planner: reads from DB but never writes. Returns avisos to be inserted by caller.
// Use this instead of gerarAvisosParaVenda when you need a dry-run (e.g. recompra editing).
export async function planejarAvisosParaVenda(params: Params): Promise<{ avisos: AvisoParaInserir[]; tipos: string[] }> {
  const {
    venda_id, loja_id, cliente_id, vendedora_id,
    cliente_nome, vendedora_nome, loja_nome,
    data_base, origem, itens, origem_recompra_id, db,
  } = params

  const recorrentes = itens.filter(i => i.recorrente && i.produto_id)
  if (recorrentes.length === 0) return { avisos: [], tipos: [] }

  let anchorIdx = 0
  let minCiclo = recorrentes[0].ciclo_recompra_dias ?? 30
  for (let i = 1; i < recorrentes.length; i++) {
    const c = recorrentes[i].ciclo_recompra_dias ?? 30
    if (c < minCiclo) { minCiclo = c; anchorIdx = i }
  }

  const anchor = recorrentes[anchorIdx]
  const produto_id = anchor.produto_id!
  const item_venda_id = anchor.id

  // Read-only: if no mensagens exist, return [] rather than seeding templates
  const { data: mensagensData } = await db
    .from('mensagens_produto')
    .select('id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta')
    .eq('produto_id', produto_id)
    .order('ordem')

  if (!mensagensData || mensagensData.length === 0) return { avisos: [], tipos: [] }

  let qtd_mensagens = anchor.qtd_mensagens
  if (qtd_mensagens == null) {
    const { data: prodData } = await db.from('produtos').select('qtd_mensagens').eq('id', produto_id).single()
    qtd_mensagens = (prodData as { qtd_mensagens: number } | null)?.qtd_mensagens ?? 3
  }

  const ordensAtivas = obterOrdensPorModelo(anchor.modelo_fluxo, qtd_mensagens)

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

  if (origem === 'recompra') {
    mensagens = mensagens.filter(m => m.tipo !== 'agradecimento')
  }

  if (mensagens.length === 0) return { avisos: [], tipos: [] }

  const nomesProdutos = recorrentes.map(r => r.produto_nome)
  const produto_nome_lista = nomesProdutos.length === 1
    ? nomesProdutos[0]
    : nomesProdutos.length === 2
      ? `${nomesProdutos[0]} e ${nomesProdutos[1]}`
      : `${nomesProdutos.slice(0, -1).join(', ')} e ${nomesProdutos[nomesProdutos.length - 1]}`

  const tipos = mensagens.map(m => m.tipo)

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

  return { avisos, tipos }
}
