'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecomprasLista } from './RecomprasLista'
import type { TipoComissao } from '@/types/app'

export interface ComissaoExtrato {
  id: string
  criado_em: string
  cliente_nome: string
  vendedora_nome: string
  vendedora_id: string
  valor_total: number
  valor_base_comissao: number
  percentual: number
  valor_comissao: number
  tipo_comissao: TipoComissao | null
  origem: string
  produtos: string[]
}

export default async function ComissoesPage() {
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
        <h1 className="text-xl font-semibold">Comissões</h1>
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

  // Fonte canônica: comissao_venda via JOIN em vendas (inclui venda_manual e recompra)
  let baseQuery = supabase
    .from('vendas')
    .select(`
      id, criado_em, data_compra, valor, origem, vendedora_id,
      clientes(nome),
      perfis!vendas_vendedora_id_fkey(nome),
      comissao_venda!inner(id, valor_venda, percentual, valor_comissao, tipo_comissao),
      itens_venda(produto_nome)
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

  const comissoes: ComissaoExtrato[] = (vendasRaw ?? []).map(v => {
    const clienteRaw = v.clientes as unknown as { nome: string } | Array<{ nome: string }> | null
    const clienteObj = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw
    const perfil = v.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    const itensArr = v.itens_venda as unknown as Array<{ produto_nome: string }> | null
    const cvRaw = v.comissao_venda as unknown as
      | Array<{ id: string; valor_venda: number; percentual: number; valor_comissao: number; tipo_comissao: TipoComissao | null }>
      | { id: string; valor_venda: number; percentual: number; valor_comissao: number; tipo_comissao: TipoComissao | null }
      | null
    const cv = Array.isArray(cvRaw) ? cvRaw[0] : cvRaw

    return {
      id: v.id as string,
      criado_em: (v.data_compra ?? v.criado_em) as string,
      cliente_nome: clienteObj?.nome ?? '—',
      vendedora_nome: perfilObj?.nome ?? '—',
      vendedora_id: v.vendedora_id as string,
      valor_total: v.valor as number,
      valor_base_comissao: cv?.valor_venda ?? 0,
      percentual: cv?.percentual ?? 0,
      valor_comissao: cv?.valor_comissao ?? 0,
      tipo_comissao: cv?.tipo_comissao ?? null,
      origem: v.origem as string,
      produtos: (itensArr ?? []).map(i => i.produto_nome),
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">
          {isVendedora ? 'Minhas comissões' : 'Comissões da equipe'}
        </h1>
        <p className="text-sm text-muted-foreground">{lojaNome}</p>
      </div>
      <RecomprasLista
        recompras={comissoes}
        isVendedora={isVendedora}
        vendedoras={vendedoras}
      />
    </div>
  )
}
