import type { TipoPremiacao, FaixaPremiacao } from '@/app/(app)/campanhas/types'
export type { FaixaPremiacao }

export interface RegraPremiacao {
  tipo: TipoPremiacao
  valor?: number | null
  percentual?: number | null
  meta_gatilho?: number | null
  progressiva_retroativa?: boolean
  faixas?: FaixaPremiacao[]
}

export interface ResultadoPremiacao {
  comissao: number
  faixa_aplicada: FaixaPremiacao | null
}

function encontrarFaixa(quantidade: number, faixas: FaixaPremiacao[]): FaixaPremiacao | null {
  const ordenadas = [...faixas].sort((a, b) => a.ordem - b.ordem)
  return (
    ordenadas.findLast(f =>
      quantidade >= f.quantidade_de && (f.quantidade_ate == null || quantidade <= f.quantidade_ate)
    ) ?? null
  )
}

function calcularFaixasProgressivas(
  quantidade: number,
  faixas: FaixaPremiacao[],
  retroativa: boolean,
): ResultadoPremiacao {
  if (faixas.length === 0) return { comissao: 0, faixa_aplicada: null }

  if (!retroativa) {
    const faixa = encontrarFaixa(quantidade, faixas)
    if (!faixa) return { comissao: 0, faixa_aplicada: null }
    const comissao = arredondar(quantidade * faixa.valor_por_unidade)
    return { comissao, faixa_aplicada: faixa }
  }

  // retroativa = false → aplica a mesma faixa ao total; retroativa = true → soma por faixa
  const ordenadas = [...faixas].sort((a, b) => a.ordem - b.ordem)
  let restante = quantidade
  let comissao = 0
  let faixaFinal: FaixaPremiacao | null = null

  for (const faixa of ordenadas) {
    if (restante <= 0) break
    const inicio = faixa.quantidade_de
    const fim = faixa.quantidade_ate ?? Infinity
    if (quantidade < inicio) break

    const dentroFaixa = Math.min(restante, fim - inicio + 1)
    comissao += arredondar(dentroFaixa * faixa.valor_por_unidade)
    restante -= dentroFaixa
    faixaFinal = faixa
  }

  return { comissao: arredondar(comissao), faixa_aplicada: faixaFinal }
}

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100
}

export function calcularPremiacao(
  quantidade: number,
  valorUnitario: number,
  regra: RegraPremiacao,
): ResultadoPremiacao {
  const valorTotal = arredondar(quantidade * valorUnitario)

  switch (regra.tipo) {
    case 'sem_premiacao':
      return { comissao: 0, faixa_aplicada: null }

    case 'fixo_unidade': {
      const valor = regra.valor ?? 0
      return { comissao: arredondar(quantidade * valor), faixa_aplicada: null }
    }

    case 'percentual': {
      const pct = regra.percentual ?? 0
      return { comissao: arredondar(valorTotal * pct), faixa_aplicada: null }
    }

    case 'bonus_meta': {
      const meta = regra.meta_gatilho ?? 0
      if (quantidade < meta) return { comissao: 0, faixa_aplicada: null }
      const valor = regra.valor ?? 0
      return { comissao: arredondar(valor), faixa_aplicada: null }
    }

    case 'faixa_progressiva': {
      const faixas = regra.faixas ?? []
      const retroativa = regra.progressiva_retroativa ?? false
      return calcularFaixasProgressivas(quantidade, faixas, retroativa)
    }

    case 'premio_fisico':
      // Premio físico não tem valor monetário calculável automaticamente
      return { comissao: 0, faixa_aplicada: null }

    default:
      return { comissao: 0, faixa_aplicada: null }
  }
}
