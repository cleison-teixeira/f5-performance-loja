export function normalizarWhatsapp(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function formatarWhatsapp(raw: string): string {
  const d = normalizarWhatsapp(raw).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}
