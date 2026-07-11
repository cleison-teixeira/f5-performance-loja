const GESTAO = ['dono', 'gerente', 'lider', 'admin_f5']

export function canAccessGestao(role: string): boolean {
  return GESTAO.includes(role)
}

export function canAccessMinhaConta(role: string): boolean {
  return GESTAO.includes(role)
}

export function canAccessEquipe(role: string): boolean {
  return GESTAO.includes(role)
}

export function canAccessBibliotecas(role: string): boolean {
  return GESTAO.includes(role)
}

export function canAccessProdutosMensagens(_role: string): boolean {
  return true
}
