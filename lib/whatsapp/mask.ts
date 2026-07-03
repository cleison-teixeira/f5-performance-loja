export function normalizarWhatsapp(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function formatarWhatsapp(raw: string): string {
  const d = normalizarWhatsapp(raw).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Converte número brasileiro (10 ou 11 dígitos) para E.164: +5548988371212
export function toE164(raw: string): string {
  const digits = normalizarWhatsapp(raw)
  // Já tem código do país 55 + DDD + número (12 ou 13 dígitos)
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  return `+55${digits}`
}
