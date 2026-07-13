const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'para', 'com'])

const SIGLAS_PRODUTO: Record<string, string> = {
  dux: 'DUX',
  bcaa: 'BCAA',
  dha: 'DHA',
  epa: 'EPA',
  tcm: 'TCM',
  mct: 'MCT',
  hmb: 'HMB',
  msm: 'MSM',
  q10: 'Q10',
  coq10: 'CoQ10',
  '5htp': '5HTP',
  f5: 'F5',
}

export function normalizarNomePessoa(input: string): string {
  if (!input) return ''
  const palavras = input.trim().replace(/\s+/g, ' ').split(' ')
  return palavras
    .map((palavra, i) => {
      if (!palavra) return ''
      const lower = palavra.toLowerCase()
      if (i > 0 && i < palavras.length - 1 && CONECTORES.has(lower)) return lower
      return lower[0].toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function normalizarNomeProduto(input: string): string {
  if (!input) return ''
  const palavras = input.trim().replace(/\s+/g, ' ').split(' ')
  return palavras
    .map((palavra, i) => {
      if (!palavra) return ''
      const lower = palavra.toLowerCase()
      if (SIGLAS_PRODUTO[lower]) return SIGLAS_PRODUTO[lower]
      if (i > 0 && i < palavras.length - 1 && CONECTORES.has(lower)) return lower
      return lower[0].toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function extrairPrimeiroNome(input: string): string {
  if (!input) return ''
  const primeiro = input.trim().split(' ')[0] || ''
  if (!primeiro) return ''
  const lower = primeiro.toLowerCase()
  return lower[0].toUpperCase() + lower.slice(1)
}
