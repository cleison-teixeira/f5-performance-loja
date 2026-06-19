export function interpolar(
  texto: string,
  vars: { cliente: string; produto: string; vendedora: string; loja: string }
): string {
  return texto
    .replace(/\{cliente\}/g, vars.cliente)
    .replace(/\{produto\}/g, vars.produto)
    .replace(/\{vendedora\}/g, vars.vendedora)
    .replace(/\{loja\}/g, vars.loja)
}
