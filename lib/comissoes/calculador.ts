import type { TipoComissao } from '@/types/app'

export function calcularComissao(valor: number, percentual: number): number {
  return Math.round((valor * percentual / 100) * 100) / 100
}

export interface ResultadoComissao {
  valor_comissao: number
  percentual: number
  tipo: TipoComissao
  campanha_id: string | null
  comissao_fixa_produto_id: string | null
}

export interface EntradaComissaoAvancada {
  valor_base_sem_fixo: number
  valor_comissao_fixa: number
  comissao_fixa_produto_id: string | null
  campanha: { id: string; comissao_fixa: number } | null
  meta: { valor_meta: number; comissao_base: number; comissao_meta: number; multiplicador: number | null } | null
  total_vendas_mes: number
  regra_padrao: { percentual: number } | null
}

export function calcularComissaoAvancada(entrada: EntradaComissaoAvancada): ResultadoComissao {
  const {
    valor_base_sem_fixo,
    valor_comissao_fixa,
    comissao_fixa_produto_id,
    campanha,
    meta,
    total_vendas_mes,
    regra_padrao,
  } = entrada

  const temFixo = comissao_fixa_produto_id !== null
  let valorPercentual = 0
  let percentual = 0
  let tipo: TipoComissao = 'padrao'
  let campanha_id: string | null = null

  if (valor_base_sem_fixo > 0) {
    // Prioridade 2: Campanha ativa
    if (campanha) {
      valorPercentual = campanha.comissao_fixa
      tipo = temFixo ? 'produto_fixo' : 'campanha'
      campanha_id = campanha.id

    // Prioridade 3: Meta
    } else if (meta) {
      if (total_vendas_mes >= meta.valor_meta) {
        percentual = meta.multiplicador != null
          ? meta.comissao_base * meta.multiplicador
          : meta.comissao_meta
        tipo = temFixo ? 'produto_fixo' : 'meta_batida'
      } else {
        percentual = meta.comissao_base
        tipo = temFixo ? 'produto_fixo' : 'base'
      }
      valorPercentual = calcularComissao(valor_base_sem_fixo, percentual)

    // Prioridade 4: Padrão
    } else {
      percentual = regra_padrao?.percentual ?? 0
      tipo = temFixo ? 'produto_fixo' : 'padrao'
      valorPercentual = calcularComissao(valor_base_sem_fixo, percentual)
    }
  } else if (temFixo) {
    tipo = 'produto_fixo'
  }

  return {
    valor_comissao: valor_comissao_fixa + valorPercentual,
    percentual,
    tipo,
    campanha_id,
    comissao_fixa_produto_id,
  }
}
