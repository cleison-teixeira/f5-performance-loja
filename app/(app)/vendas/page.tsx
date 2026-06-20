import { createClient } from '@/lib/supabase/server'
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
  valor_comissao: number
  origem: string
  qtd_avisos: number
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
      id, valor, criado_em, data_compra, vendedora_id, origem,
      clientes(nome, whatsapp),
      perfis!vendas_vendedora_id_fkey(nome),
      itens_venda(produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente),
      comissao_venda(valor_comissao),
      avisos(id)
    `)
    .eq('loja_id', loja_id)
    .gte('criado_em', dataInicio.toISOString())
    .order('data_compra', { ascending: false })
    .order('criado_em', { ascending: false })

  if (isVendedora) {
    baseQuery = baseQuery.eq('vendedora_id', user.id)
  }

  const { data: vendasRaw } = await baseQuery

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
    const avisosArr = v.avisos as unknown as Array<{ id: string }> | null
    const cvRaw = v.comissao_venda as unknown as
      | Array<{ valor_comissao: number }> | { valor_comissao: number } | null
    const cv = Array.isArray(cvRaw) ? cvRaw[0] : cvRaw

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
      valor_comissao: cv?.valor_comissao ?? 0,
      origem: (v as unknown as { origem: string }).origem ?? 'venda_manual',
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
