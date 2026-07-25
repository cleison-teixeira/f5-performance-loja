import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP } from '@/lib/mensagens/templates_padrao'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbLike = { from: (table: string) => any }

const DEFAULT_TEMPLATES_MAP: Record<number, { ordem: number; tipo: string; dias_apos_venda: number; texto: string }> = {
  1: TEMPLATES_PADRAO[0],
  2: TEMPLATES_PADRAO[1],
  3: TEMPLATES_PADRAO[2],
  4: TEMPLATE_OFERTA,
  5: TEMPLATE_FOLLOW_UP,
}

// Idempotent: ensures all 5 template orders exist for a product.
// Only writes to mensagens_produto, never to avisos.
// Returns true if any templates were inserted, false if all already existed.
export async function garantirMensagensProduto(produto_id: string, db: DbLike): Promise<boolean> {
  const { data: existentes } = await db
    .from('mensagens_produto')
    .select('ordem')
    .eq('produto_id', produto_id)

  const ordensExistentes = new Set(((existentes ?? []) as { ordem: number }[]).map(r => r.ordem))
  const faltantes = [1, 2, 3, 4, 5].filter(o => !ordensExistentes.has(o))

  if (faltantes.length === 0) return false

  const novos = faltantes.map(ordem => {
    const t = DEFAULT_TEMPLATES_MAP[ordem]
    return {
      produto_id,
      ordem: t.ordem,
      tipo: t.tipo,
      dias_apos_venda: t.dias_apos_venda,
      texto: t.texto,
      estilo: 'clean',
      tipo_incentivo: 'nenhum',
    }
  })

  // ON CONFLICT (produto_id, ordem) DO NOTHING — safe under concurrent calls.
  // The UNIQUE constraint mensagens_produto_produto_id_ordem_key guarantees idempotency.
  const { error } = await db.from('mensagens_produto').upsert(novos, {
    onConflict: 'produto_id,ordem',
    ignoreDuplicates: true,
  })
  if (error) {
    throw new Error(`Falha ao garantir mensagens do produto: ${error.message}`)
  }
  return true
}
