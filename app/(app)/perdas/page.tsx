export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'
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
  loja_nome?: string
}

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function PerdasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: todosMembros } = await admin
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  if (!todosMembros || todosMembros.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Recompras perdidas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const userRole = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const multiLoja = !isAcessoLoja(userRole)
  const ctx = await getContextoLoja(user.id, multiLoja)

  if (ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Recompras perdidas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const isVendedora = userRole === 'vendedora'
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'}`
    : `${ctx.lojaNome} · Visão da loja selecionada`

  const noventa = new Date()
  noventa.setDate(noventa.getDate() - 90)
  const limite90 = noventa.toISOString()

  let query = admin
    .from('avisos')
    .select(`
      id, encerrado_em, motivo_perda, observacao_resultado, vendedora_id, loja_id,
      clientes(nome, whatsapp),
      itens_venda(produto_nome, subtotal)
    `)
    .in('loja_id', ctx.lojaIds)
    .eq('status', 'perdida')
    .gte('encerrado_em', limite90)
    .order('encerrado_em', { ascending: false })

  if (isVendedora) query = query.eq('vendedora_id', user.id)

  const { data: perdasRaw } = await query

  const vendedoraIds = [...new Set((perdasRaw ?? []).map(p => p.vendedora_id as string).filter(Boolean))]
  const vendedoraNomeMap = new Map<string, string>()
  if (vendedoraIds.length > 0) {
    const { data: perfis } = await admin
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
    const perdaLojaId = p.loja_id as string

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
      loja_nome: mostrarLoja ? (lojaNomeMap.get(perdaLojaId) ?? '') : undefined,
    }
  })

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Recompras perdidas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitulo}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Oportunidades encerradas nos últimos 90 dias.
        </p>
      </div>
      <PerdasLista perdas={perdas} isVendedora={isVendedora} mostrarLoja={mostrarLoja} />
    </div>
  )
}
