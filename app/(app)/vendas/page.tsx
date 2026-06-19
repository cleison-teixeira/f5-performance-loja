import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { VendasLista } from './VendasLista'

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
  previsao_comissao: number
  qtd_avisos: number
}

function calcPrevisaoVenda(
  itens: Array<{ produto_id: string | null; subtotal: number; recorrente: boolean }>,
  vendedora_id: string,
  fixasPorVend: Record<string, Record<string, number>>,
  percentualPorVend: Record<string, number>
): number {
  const fixasVend = fixasPorVend[vendedora_id] ?? {}
  const percentual = percentualPorVend[vendedora_id] ?? 0
  let fixaTotal = 0
  let baseTotal = 0
  for (const item of itens) {
    if (!item.recorrente) continue
    const fixo = item.produto_id ? fixasVend[item.produto_id] : undefined
    if (fixo != null) {
      fixaTotal += fixo
    } else {
      baseTotal += item.subtotal
    }
  }
  return Math.round((fixaTotal + baseTotal * percentual / 100) * 100) / 100
}

export default async function VendasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Extrato de vendas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const loja_id = membro.loja_id as string
  const userRole = membro.role as string
  const isVendedora = userRole === 'vendedora'

  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - 90)

  let baseQuery = supabase
    .from('vendas')
    .select(`
      id, valor, criado_em, data_compra, vendedora_id,
      clientes(nome, whatsapp),
      perfis!vendas_vendedora_id_fkey(nome),
      itens_venda(produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente),
      avisos(id, previsao_comissao)
    `)
    .eq('loja_id', loja_id)
    .gte('criado_em', dataInicio.toISOString())
    .order('data_compra', { ascending: false })
    .order('criado_em', { ascending: false })

  if (isVendedora) {
    baseQuery = baseQuery.eq('vendedora_id', user.id)
  }

  const { data: vendasRaw } = await baseQuery

  const admin = createAdminClient()
  const [fixasRes, regrasRes] = await Promise.all([
    admin.from('comissao_fixa_produto')
      .select('vendedora_id, produto_id, valor_fixo')
      .eq('loja_id', loja_id)
      .eq('ativo', true),
    admin.from('regras_comissao')
      .select('vendedora_id, percentual')
      .eq('loja_id', loja_id)
      .eq('ativo', true),
  ])

  const fixasPorVendedoraProduto: Record<string, Record<string, number>> = {}
  for (const f of fixasRes.data ?? []) {
    const vid = f.vendedora_id as string
    const pid = f.produto_id as string
    if (!fixasPorVendedoraProduto[vid]) fixasPorVendedoraProduto[vid] = {}
    fixasPorVendedoraProduto[vid][pid] = f.valor_fixo as number
  }
  const percentualPorVendedora: Record<string, number> = {}
  for (const r of regrasRes.data ?? []) {
    percentualPorVendedora[r.vendedora_id as string] = r.percentual as number
  }

  let vendedoras: { id: string; nome: string }[] = []
  if (!isVendedora) {
    const { data: membros } = await supabase
      .from('membros_loja')
      .select('perfil_id, perfis(nome)')
      .eq('loja_id', loja_id)
      .eq('role', 'vendedora')
      .eq('ativo', true)

    vendedoras = (membros ?? []).map(m => {
      const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }>
      const perfil = Array.isArray(p) ? p[0] : p
      return { id: m.perfil_id as string, nome: perfil?.nome ?? 'Sem nome' }
    })
  }

  const vendas: VendaExtrato[] = (vendasRaw ?? []).map(v => {
    const clienteRaw = v.clientes as unknown as { nome: string; whatsapp: string } | Array<{ nome: string; whatsapp: string }> | null
    const cliente = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw
    const perfil = v.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    const itensRaw = v.itens_venda as unknown as Array<{
      produto_id: string | null; produto_nome: string; quantidade: number; valor_unitario: number; subtotal: number; recorrente: boolean
    }> | null
    const avisosArr = v.avisos as unknown as Array<{ id: string; previsao_comissao: number | null }> | null

    const itens = (itensRaw ?? []).map(i => ({
      produto_nome: i.produto_nome,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      subtotal: i.subtotal,
      recorrente: i.recorrente ?? false,
    }))

    const mappedItens = (itensRaw ?? []).map(i => ({
      produto_id: i.produto_id ?? null,
      subtotal: i.subtotal,
      recorrente: i.recorrente ?? false,
    }))

    const vendedora_id = v.vendedora_id as string

    return {
      id: v.id as string,
      criado_em: v.criado_em as string,
      data_compra: (v as unknown as { data_compra: string }).data_compra ?? (v.criado_em as string).split('T')[0],
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      vendedora_nome: perfilObj?.nome ?? '—',
      vendedora_id,
      valor_total: v.valor as number,
      itens,
      tem_recorrente: itens.some(i => i.recorrente),
      previsao_comissao: calcPrevisaoVenda(mappedItens, vendedora_id, fixasPorVendedoraProduto, percentualPorVendedora),
      qtd_avisos: (avisosArr ?? []).length,
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Extrato de vendas</h1>
        <p className="text-sm text-muted-foreground">{lojaNome}</p>
      </div>
      <VendasLista vendas={vendas} isVendedora={isVendedora} vendedoras={vendedoras} />
    </div>
  )
}
