import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecomprasLista } from './RecomprasLista'
import type { TipoComissao } from '@/types/app'

export interface RecompraExtrato {
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

  let baseQuery = supabase
    .from('recompras')
    .select(`
      id, criado_em, valor_total, valor_base_comissao, vendedora_id,
      clientes(nome),
      perfis!recompras_vendedora_id_fkey(nome),
      itens_recompra(produto_nome),
      comissao_venda(percentual, valor_comissao, tipo_comissao)
    `)
    .eq('loja_id', loja_id)
    .gte('criado_em', dataInicio.toISOString())
    .order('criado_em', { ascending: false })

  if (isVendedora) {
    baseQuery = baseQuery.eq('vendedora_id', user.id)
  }

  const { data: recomprasRaw } = await baseQuery

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

  const recompras: RecompraExtrato[] = (recomprasRaw ?? []).map(r => {
    const clienteRaw = r.clientes as unknown as { nome: string } | Array<{ nome: string }> | null
    const clienteObj = Array.isArray(clienteRaw) ? clienteRaw[0] : clienteRaw
    const perfil = r.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfilObj = Array.isArray(perfil) ? perfil[0] : perfil
    const itensArr = r.itens_recompra as unknown as Array<{ produto_nome: string }> | null
    const comissaoRaw = r.comissao_venda as unknown as
      | Array<{ percentual: number; valor_comissao: number; tipo_comissao: TipoComissao | null }>
      | { percentual: number; valor_comissao: number; tipo_comissao: TipoComissao | null }
      | null
    const comissao = Array.isArray(comissaoRaw) ? comissaoRaw[0] : comissaoRaw

    return {
      id: r.id as string,
      criado_em: r.criado_em as string,
      cliente_nome: clienteObj?.nome ?? '—',
      vendedora_nome: perfilObj?.nome ?? '—',
      vendedora_id: r.vendedora_id as string,
      valor_total: r.valor_total as number,
      valor_base_comissao: r.valor_base_comissao as number,
      percentual: comissao?.percentual ?? 0,
      valor_comissao: comissao?.valor_comissao ?? 0,
      tipo_comissao: comissao?.tipo_comissao ?? null,
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
        recompras={recompras}
        isVendedora={isVendedora}
        vendedoras={vendedoras}
      />
    </div>
  )
}
