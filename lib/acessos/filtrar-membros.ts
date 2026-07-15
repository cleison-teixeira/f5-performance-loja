function normalizarId(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Retorna true se o membro é a "conta estrutural" da loja (não uma pessoa física).
 *
 * Critério 1 (nome = loja): perfilNome normalizado === lojaNome normalizado.
 *   → Ex: "Cia da Saúde Angeloni" é o nome do perfil E o nome da loja.
 *
 * Critério 2 (email exato): auth email do perfil === lojas.email OU qualquer email
 *   de liberacoes_acesso da loja (comparação exata, normalizada).
 *   → Definitivo: o auth user da conta estrutural usa o mesmo e-mail que a loja.
 *   → Erros de digitação devem ser corrigidos nos dados/Admin, não no código.
 *
 * Prefixo de e-mail NÃO é usado como critério.
 * Somente role === 'dono' pode ser conta estrutural.
 */
export function isContaEstrutural({
  role,
  perfilNome,
  perfilEmail,
  lojaNome,
  lojaEmail,
  lojaLibEmails,
}: {
  role: string
  perfilNome: string
  perfilEmail?: string | null
  lojaNome: string
  lojaEmail?: string | null
  lojaLibEmails?: string[] | null
}): boolean {
  if (role !== 'dono') return false

  const nome = normalizarId(perfilNome)

  // Critério 1: nome do perfil === nome da loja
  if (nome === normalizarId(lojaNome)) return true

  // Critério 2: auth email do perfil === lojas.email ou qualquer email de liberação
  if (perfilEmail) {
    const normalPerfilEmail = normalizarId(perfilEmail)
    const allLojaEmails = [lojaEmail, ...(lojaLibEmails ?? [])].filter(Boolean) as string[]
    if (allLojaEmails.some(e => normalizarId(e) === normalPerfilEmail)) return true
  }

  return false
}
