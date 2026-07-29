import type { AvisoDetalhado, ItemVendaGrupo } from '@/app/(app)/avisos/types'

function normalize(s: string): string {
  // eslint-disable-next-line no-misleading-character-class
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function filtrarAvisosPorBusca(
  avisos: AvisoDetalhado[],
  busca: string,
  itensVendaPorVenda?: Record<string, ItemVendaGrupo[]>
): AvisoDetalhado[] {
  if (!busca.trim()) return avisos

  const q = normalize(busca)
  const digits = busca.replace(/\D/g, '')

  return avisos.filter(a => {
    const matchNome = normalize(a.cliente_nome).includes(q)
    const matchWhatsapp = digits.length >= 4 && a.cliente_whatsapp.includes(digits)
    const matchProdutoAncora = normalize(a.produto_nome).includes(q)
    const matchProdutoGrupo = (itensVendaPorVenda?.[a.venda_id] ?? []).some(
      i => normalize(i.produto_nome).includes(q)
    )
    return matchNome || matchWhatsapp || matchProdutoAncora || matchProdutoGrupo
  })
}
