import { interpolar } from '@/lib/mensagens/interpolador'

interface ContextoAviso {
  venda_id: string
  item_venda_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  cliente_nome: string
  produto_nome: string
  vendedora_nome: string
  loja_nome: string
  origem_recompra_id?: string
  categoria?: string | null
  parceiro?: string | null
}

interface MensagemProduto {
  id: string
  tipo: string
  texto: string
  dias_apos_venda: number
  estilo?: string | null
  tipo_incentivo?: string | null
  cupom_codigo?: string | null
  desconto_percentual?: number | null
  desconto_valor?: number | null
  beneficio_texto?: string | null
  validade_oferta?: string | null
}

export interface AvisoParaInserir {
  venda_id: string
  item_venda_id: string
  loja_id: string
  cliente_id: string
  vendedora_id: string
  mensagem_id: string
  texto_renderizado: string
  data_aviso: string
  status: 'pendente'
  previsao_comissao?: number
  origem_recompra_id?: string
}

function cleanMessage(text: string): string {
  return text
    .replace(/:\s*\./g, '.')
    .replace(/:\s*,/g, ',')
    .replace(/\s+([.,!?])/g, '$1') // remove spaces before punctuation
    .replace(/\s+/g, ' ')          // collapse multiple spaces
    .trim();
}

export function gerarAvisos(
  mensagens: MensagemProduto[],
  ctx: ContextoAviso,
  dataBase: string,  // YYYY-MM-DD — usa data_compra como referência
  cicloReal?: number | null
): AvisoParaInserir[] {
  const [ano, mes, dia] = dataBase.split('-').map(Number)
  const base = new Date(ano, mes - 1, dia)

  // Determinar o ciclo base (N)
  const recompraMsg = mensagens.find(m => m.tipo === 'recompra')
  const N = (cicloReal != null && cicloReal > 0) 
    ? cicloReal 
    : (recompraMsg?.dias_apos_venda ?? 30)

  return mensagens.map(msg => {
    const dataAviso = new Date(base)
    
    // Regras de cadência inteligente e limites de segurança
    let diasOffset = 0
    if (msg.tipo === 'agradecimento') {
      diasOffset = 0
    } else if (msg.tipo === 'relacionamento') {
      diasOffset = Math.max(0, Math.floor(N / 2))
    } else if (msg.tipo === 'recompra') {
      const relOffset = Math.max(0, Math.floor(N / 2))
      diasOffset = Math.max(relOffset, N - 5)
    } else if (msg.tipo === 'oferta') {
      const relOffset = Math.max(0, Math.floor(N / 2))
      const recOffset = Math.max(relOffset, N - 5)
      diasOffset = Math.max(recOffset, N - 1)
    } else if (msg.tipo === 'follow_up') {
      const relOffset = Math.max(0, Math.floor(N / 2))
      const recOffset = Math.max(relOffset, N - 5)
      const ofOffset = Math.max(recOffset, N - 1)
      diasOffset = Math.max(ofOffset + 1, N + 2)
    } else {
      diasOffset = msg.dias_apos_venda
    }

    dataAviso.setDate(base.getDate() + diasOffset)
    const y = dataAviso.getFullYear()
    const m = String(dataAviso.getMonth() + 1).padStart(2, '0')
    const d = String(dataAviso.getDate()).padStart(2, '0')

    // Mapeamento de variáveis para interpolação de templates comerciais
    const mapVariaveis: Record<string, string> = {
      cliente: ctx.cliente_nome,
      cliente_nome: ctx.cliente_nome,
      primeiro_nome: ctx.cliente_nome.split(' ')[0] || '',
      vendedora: ctx.vendedora_nome,
      vendedora_nome: ctx.vendedora_nome,
      loja: ctx.loja_nome,
      loja_nome: ctx.loja_nome,
      produto: ctx.produto_nome,
      produto_nome: ctx.produto_nome,
      categoria: ctx.categoria || '',
      parceiro: ctx.parceiro || '',
      ciclo_dias: String(N),
      cupom: msg.cupom_codigo || '',
      desconto_percentual: msg.desconto_percentual != null ? `${msg.desconto_percentual}%` : '',
      desconto_valor: msg.desconto_valor != null ? `R$ ${msg.desconto_valor.toFixed(2).replace('.', ',')}` : '',
      beneficio: msg.beneficio_texto || '',
      validade_oferta: msg.validade_oferta || '',
    }

    // Substituir chaves {{chave}} e {chave} de forma limpa e segura
    let textoRenderizado = msg.texto
    Object.entries(mapVariaveis).forEach(([chave, valor]) => {
      const regex = new RegExp(`{{\\s*${chave}\\s*}}`, 'gi')
      textoRenderizado = textoRenderizado.replace(regex, valor)
      const legacyRegex = new RegExp(`{\\s*${chave}\\s*}`, 'gi')
      textoRenderizado = textoRenderizado.replace(legacyRegex, valor)
    })

    // Limpar espaços ou pontuações resultantes de placeholders vazios
    textoRenderizado = cleanMessage(textoRenderizado)

    return {
      venda_id: ctx.venda_id,
      item_venda_id: ctx.item_venda_id,
      loja_id: ctx.loja_id,
      cliente_id: ctx.cliente_id,
      vendedora_id: ctx.vendedora_id,
      mensagem_id: msg.id,
      texto_renderizado: textoRenderizado,
      data_aviso: `${y}-${m}-${d}`,
      status: 'pendente' as const,
      ...(ctx.origem_recompra_id ? { origem_recompra_id: ctx.origem_recompra_id } : {}),
    }
  })
}
