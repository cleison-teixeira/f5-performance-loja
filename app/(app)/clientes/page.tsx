export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'
import { ClientesLista } from './ClientesLista'
import type { ClienteItem } from './ClientesLista'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function ClientesPage() {
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
        <h1 className="text-xl font-semibold">Clientes de recompra</h1>
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
        <h1 className="text-xl font-semibold">Clientes de recompra</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'}`
    : ctx.lojaNome

  const [clientesRes, vendasRes] = await Promise.all([
    admin
      .from('clientes')
      .select('id, nome, whatsapp, criado_em, loja_id')
      .in('loja_id', ctx.lojaIds)
      .order('nome'),
    admin
      .from('vendas')
      .select('cliente_id, valor, data_compra')
      .in('loja_id', ctx.lojaIds)
      .order('data_compra', { ascending: false }),
  ])

  type VendaStats = { qtd: number; total: number; ultima: string }
  const vendasPorCliente: Record<string, VendaStats> = {}
  for (const v of vendasRes.data ?? []) {
    const cid = v.cliente_id as string | null
    if (!cid) continue
    if (!vendasPorCliente[cid]) {
      vendasPorCliente[cid] = { qtd: 0, total: 0, ultima: v.data_compra as string }
    }
    vendasPorCliente[cid].qtd++
    vendasPorCliente[cid].total += (v.valor as number) ?? 0
  }

  const clientes: ClienteItem[] = (clientesRes.data ?? []).map(c => {
    const stats = vendasPorCliente[c.id as string]
    return {
      id: c.id as string,
      nome: c.nome as string,
      whatsapp: c.whatsapp as string,
      criado_em: c.criado_em as string,
      qtd: stats?.qtd ?? 0,
      total: stats?.total ?? 0,
      ultima: stats?.ultima ?? null,
      loja_nome: mostrarLoja ? (lojaNomeMap.get(c.loja_id as string) ?? '') : null,
    }
  })

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Clientes de recompra</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{subtitulo}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Base de clientes que podem comprar de novo.
        </p>
      </div>
      <ClientesLista clientes={clientes} mostrarLoja={mostrarLoja} />
    </div>
  )
}
