export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { getAppContext } from '@/lib/app/contexto'
import { VendasPageClient } from './VendasPageClient'
import { measureAsync } from '@/lib/performance/timing'
import { isContaEstrutural } from '@/lib/acessos/filtrar-membros'

export interface VendaItemExtrato {
  produto_nome: string
  quantidade: number
  valor_unitario: number
  subtotal: number
  recorrente: boolean
}

export interface VendaExtrato {
  id: string
  criado_em: string
  data_compra: string
  cliente_nome: string
  cliente_whatsapp: string
  vendedora_nome: string
  vendedora_id: string
  valor_total: number
  itens: VendaItemExtrato[]
  tem_recorrente: boolean
  valor_comissao: number
  origem: string
  qtd_avisos: number
  loja_nome?: string
}

export default async function VendasPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { user, role: userRole, ctx } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Extrato de vendas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const admin = createAdminClient()

  const isVendedora = userRole === 'vendedora'
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'}`
    : ctx.lojaNome

  let vendasQuery = admin
    .from('vendas')
    .select(`
      id, valor, criado_em, data_compra, vendedora_id, origem, loja_id,
      clientes(nome, whatsapp),
      perfis!vendas_vendedora_id_fkey(nome),
      itens_venda(produto_nome, quantidade, valor_unitario, subtotal, recorrente),
      avisos(id)
    `)
    .in('loja_id', ctx.lojaIds)
    .order('data_compra', { ascending: false })
    .order('criado_em', { ascending: false })

  if (isVendedora) {
    vendasQuery = vendasQuery.eq('vendedora_id', user.id)
  }

  const [vendasRes, membrosRes, lojaEmailsRes] = await measureAsync('vendas:queries', () => Promise.all([
    vendasQuery,
    isVendedora
      ? Promise.resolve({ data: null })
      : admin
          .from('membros_loja')
          .select('perfil_id, loja_id, role, perfis(nome)')
          .in('loja_id', ctx.lojaIds)
          .in('role', ['dono', 'gerente', 'lider', 'vendedora'])
          .eq('ativo', true),
    isVendedora
      ? Promise.resolve({ data: [] as Array<{ loja_id: string; email: string }> })
      : admin
          .from('liberacoes_acesso')
          .select('loja_id, email')
          .in('loja_id', ctx.lojaIds)
          .eq('tipo', 'loja')
          .order('criado_em', { ascending: true }),
  ]))

  const vendasRaw = vendasRes.data

  const lojaEmailMap = new Map<string, string>()
  for (const row of lojaEmailsRes.data ?? []) {
    const lid = row.loja_id as string
    if (!lojaEmailMap.has(lid)) lojaEmailMap.set(lid, row.email as string)
  }

  // Buscar auth email dos donos para Critério 2 (email perfil === email loja)
  const donoIdsV = !isVendedora
    ? [...new Set(
        (membrosRes.data ?? [])
          .filter(m => (m as unknown as { role: string }).role === 'dono')
          .map(m => m.perfil_id as string)
      )]
    : []
  const donoAuthEmailsV: Record<string, string> = {}
  if (donoIdsV.length > 0) {
    await Promise.all(donoIdsV.map(async pid => {
      const { data } = await admin.auth.admin.getUserById(pid)
      if (data?.user?.email) donoAuthEmailsV[pid] = data.user.email
    }))
  }

  let vendedoras: { id: string; nome: string }[] = []
  if (!isVendedora && membrosRes.data) {
    const seen = new Set<string>()
    vendedoras = (membrosRes.data ?? []).flatMap(m => {
      const pid = m.perfil_id as string
      if (seen.has(pid)) return []
      seen.add(pid)
      const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }>
      const perfil = Array.isArray(p) ? p[0] : p
      const nome = perfil?.nome ?? 'Sem nome'
      const memberRole = (m as unknown as { role: string }).role
      const memberLojaId = (m as unknown as { loja_id: string }).loja_id
      const lojaNome = lojaNomeMap.get(memberLojaId) ?? ''
      const lojaEmail = lojaEmailMap.get(memberLojaId) ?? null
      const perfilEmail = donoAuthEmailsV[pid] ?? null
      if (isContaEstrutural({ role: memberRole, perfilNome: nome, perfilEmail, lojaNome, lojaEmail })) return []
      return [{ id: pid, nome }]
    })
  }

  const vendas: VendaExtrato[] = (vendasRaw ?? []).map(v => {
    const clienteRaw = v.clientes as unknown as { nome: string; whatsapp: string } | Array<{ nome: string; whatsapp: string }> | null
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw
    const perfil = v.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    const itensRaw = v.itens_venda as unknown as Array<{
      produto_nome: string; quantidade: number; valor_unitario: number; subtotal: number; recorrente: boolean
    }> | null
    const avisosArr = v.avisos as unknown as Array<{ id: string }> | null
    const vendaLojaId = (v as unknown as { loja_id: string }).loja_id

    const itens = (itensRaw ?? []).map(i => ({
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      subtotal: i.subtotal,
      recorrente: i.recorrente ?? false,
    }))

    return {
      id: v.id as string,
      criado_em: v.criado_em as string,
      data_compra: (v as unknown as { data_compra: string }).data_compra ?? (v.criado_em as string).split('T')[0],
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      vendedora_nome: perfilObj?.nome ?? '—',
      vendedora_id: v.vendedora_id as string,
      valor_total: v.valor as number,
      itens,
      tem_recorrente: itens.some(i => i.recorrente),
      valor_comissao: 0,
      origem: (v as unknown as { origem: string }).origem ?? 'venda_manual',
      qtd_avisos: (avisosArr ?? []).length,
      loja_nome: mostrarLoja ? (lojaNomeMap.get(vendaLojaId) ?? '') : undefined,
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Extrato de vendas</h1>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </div>
      <VendasPageClient
        initialVendas={vendas}

        isVendedora={isVendedora}
        vendedoras={vendedoras}
        mostrarLoja={mostrarLoja}
      />
    </div>
  )
}
