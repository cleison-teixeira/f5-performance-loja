function normalizarId(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Retorna true se o membro é a "conta estrutural" da loja (não uma pessoa física).
 *
 * Critério 1 (nome = loja): perfilNome normalizado === lojaNome normalizado.
 *   → Ex: "Cia da Saúde Angeloni" é o nome do perfil E o nome da loja.
 *
 * Critério 2 (email = email loja): perfilEmail normalizado === lojaEmail normalizado.
 *   → Definitivo: o auth user da conta estrutural usa o mesmo e-mail que a loja.
 *   → Ex: ciaararangua@redeciadasaude.com.br === ciaararangua@redeciadasaude.com.br.
 *
 * Prefixo de e-mail sozinho foi REMOVIDO como critério.
 * Sem o e-mail real do perfil confirmado, o prefixo pode gerar falso positivo
 * (ex: Gestor(a) chamado "Fábio" cujo e-mail fabio@ coincide com o prefixo da loja).
 *
 * Somente role === 'dono' pode ser conta estrutural.
 * Gestores reais (pessoas físicas com role='dono') não são afetados
 * porque seu e-mail de auth não coincide com o e-mail estrutural da loja.
 */
export function isContaEstrutural({
  role,
  perfilNome,
  perfilEmail,
  lojaNome,
  lojaEmail,
}: {
  role: string
  perfilNome: string
  perfilEmail?: string | null
  lojaNome: string
  lojaEmail?: string | null
}): boolean {
  if (role !== 'dono') return false

  const nome = normalizarId(perfilNome)

  // Critério 1: nome do perfil === nome da loja
  if (nome === normalizarId(lojaNome)) return true

  // Critério 2: email do perfil (auth) === email estrutural da loja
  if (perfilEmail && lojaEmail) {
    if (normalizarId(perfilEmail) === normalizarId(lojaEmail)) return true
  }

  return false
}
