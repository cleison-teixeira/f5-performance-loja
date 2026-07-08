const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

export function normalizarNomePessoa(input: string): string {
  if (!input) return ''
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palavra, i) => {
      if (!palavra) return ''
      const lower = palavra.toLowerCase()
      if (i > 0 && CONECTORES.has(lower)) return lower
      return lower[0].toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function normalizarNomeProduto(input: string): string {
  if (!input) return ''
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palavra, i) => {
      if (!palavra) return ''
      const lower = palavra.toLowerCase()
      if (i > 0 && CONECTORES.has(lower)) return lower
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
