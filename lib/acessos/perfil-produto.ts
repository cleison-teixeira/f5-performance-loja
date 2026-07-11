export type PerfilProduto = 'acesso_loja' | 'acesso_multiloja' | 'admin_f5'

const MAPA: Record<string, PerfilProduto> = {
  vendedora: 'acesso_loja',
  gerente: 'acesso_loja',
  lider: 'acesso_loja',
  dono: 'acesso_multiloja',
  admin_f5: 'admin_f5',
}

export function getPerfilProduto(role: string): PerfilProduto {
  return MAPA[role] ?? 'acesso_loja'
}

export function isAcessoLoja(role: string): boolean {
  return getPerfilProduto(role) === 'acesso_loja'
}

export function isAcessoMultiloja(role: string): boolean {
  return getPerfilProduto(role) === 'acesso_multiloja'
}

export function isAdminF5(role: string): boolean {
  return getPerfilProduto(role) === 'admin_f5'
}

export const LABEL_PERFIL: Record<PerfilProduto, string> = {
  acesso_loja: 'Acesso Loja',
  acesso_multiloja: 'Multi-loja',
  admin_f5: 'Admin F5',
}
