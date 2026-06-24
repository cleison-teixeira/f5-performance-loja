import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PerdasLista } from './PerdasLista'

export interface PerdaItem {
  id: string
  encerrado_em: string | null
  motivo_perda: string | null
  observacao_resultado: string | null
  cliente_nome: string
  cliente_whatsapp: string
  produto_nome: string
  valor_produto: number
  vendedora_nome: string
}

export default async function PerdasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(id, nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Recompras perdidas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const isVendedora = (membro.role as string) === 'vendedora'

  // Busca perdas dos últimos 90 dias — filtros menores (30d) são feitos no cliente
  const noventa = new Date()
  noventa.setDate(noventa.getDate() - 90)
  const limite90 = noventa.toISOString()

  let query = supabase
    .from('avisos')
    .select(`
      id, encerrado_em, motivo_perda, observacao_resultado, vendedora_id,
      clientes(nome, whatsapp),
      itens_venda(produto_nome, subtotal)
    `)
    .eq('loja_id', loja.id)
    .eq('status', 'perdida')
    .gte('encerrado_em', limite90)
    .order('encerrado_em', { ascending: false })

  if (isVendedora) query = query.eq('vendedora_id', user.id)

  const { data: perdasRaw } = await query

  // Nomes das vendedoras
  const vendedoraIds = [...new Set((perdasRaw ?? []).map(p => p.vendedora_id as string).filter(Boolean))]
  const vendedoraNomeMap = new Map<string, string>()
  if (vendedoraIds.length > 0) {
    const { data: perfis } = await supabase
      .from('perfis')
      .select('id, nome')
      .in('id', vendedoraIds)
    for (const p of perfis ?? []) {
      vendedoraNomeMap.set(p.id as string, p.nome as string)
    }
  }

  const perdas: PerdaItem[] = (perdasRaw ?? []).map(p => {
    const cliente = p.clientes as unknown as { nome: string; whatsapp: string } | null
    const itemVenda = p.itens_venda as unknown as { produto_nome: string; subtotal: number | null } | null

    return {
      id: p.id as string,
      encerrado_em: (p as unknown as { encerrado_em: string | null }).encerrado_em ?? null,
      motivo_perda: (p as unknown as { motivo_perda: string | null }).motivo_perda ?? null,
      observacao_resultado: (p as unknown as { observacao_resultado: string | null }).observacao_resultado ?? null,
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      produto_nome: itemVenda?.produto_nome ?? 'Produto',
      valor_produto: itemVenda?.subtotal ?? 0,
      vendedora_nome: vendedoraNomeMap.get(p.vendedora_id as string) ?? '',
    }
  })

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Recompras perdidas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja.nome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Oportunidades encerradas nos últimos 90 dias.
        </p>
      </div>
      <PerdasLista perdas={perdas} isVendedora={isVendedora} />
    </div>
  )
}
