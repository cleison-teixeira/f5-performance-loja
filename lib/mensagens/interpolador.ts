export function interpolar(
  texto: string,
  vars: { cliente_nome: string; produto_nome: string; vendedora_nome: string; loja_nome: string }
): string {
  return texto
    .replace(/\{cliente_nome\}/g, vars.cliente_nome)
    .replace(/\{produto_nome\}/g, vars.produto_nome)
    .replace(/\{vendedora_nome\}/g, vars.vendedora_nome)
    .replace(/\{loja_nome\}/g, vars.loja_nome)
    .replace(/\{cliente\}/g, vars.cliente_nome)
    .replace(/\{produto\}/g, vars.produto_nome)
    .replace(/\{vendedora\}/g, vars.vendedora_nome)
    .replace(/\{loja\}/g, vars.loja_nome)
}
