export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ClientesPageClient } from './ClientesPageClient'
import type { ClienteItem } from './ClientesLista'
import { getAppContext } from '@/lib/app/contexto'
import { startTimer } from '@/lib/performance/timing'

export default async function ClientesPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { ctx, role } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Clientes de recompra</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const admin = createAdminClient()

  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'}`
    : ctx.lojaNome

  const endClientes = startTimer('clientes:queries')
  const clientesRes = await admin
    .from('clientes')
    .select('id, nome, whatsapp, observacao, criado_em, loja_id, nao_contatar')
    .in('loja_id', ctx.lojaIds)
    .order('nome')
    .limit(50)

  const clienteIds = (clientesRes.data ?? []).map(c => c.id as string)

  const vendasRes = clienteIds.length > 0
    ? await admin
        .from('vendas')
        .select('cliente_id, valor, data_compra')
        .in('cliente_id', clienteIds)
        .order('data_compra', { ascending: false })
    : { data: [] }
  endClientes()

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
      observacao: (c as unknown as { observacao: string | null }).observacao ?? null,
      criado_em: c.criado_em as string,
      qtd: stats?.qtd ?? 0,
      total: stats?.total ?? 0,
      ultima: stats?.ultima ?? null,
      loja_nome: mostrarLoja ? (lojaNomeMap.get(c.loja_id as string) ?? '') : null,
      nao_contatar: (c.nao_contatar as boolean) ?? false,
      loja_id: c.loja_id as string,
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
      <ClientesPageClient
        initialClientes={clientes}
        initialNextCursor={(clientesRes.data?.length ?? 0) === 50 ? '50' : null}
        mostrarLoja={mostrarLoja}
        role={role}
      />
    </div>
  )
}
