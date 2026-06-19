import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfigComissoesClient } from './ConfigComissoesClient'
import type { VendedoraMeta } from './FormMetaMensal'
import type { RegraFixa } from './FormComissaoFixaProduto'

export interface VendedoraComissao {
  perfil_id: string
  nome: string
  percentual: number
}

function mesAtualFmt(): { mes: string; mesLabel: string } {
  const d = new Date()
  const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const mesLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { mes, mesLabel }
}

export default async function ConfigComissoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meuMembro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!meuMembro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Comissões</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const userRole = meuMembro.role as string

  // Vendedoras não têm acesso a esta área
  if (userRole === 'vendedora') redirect('/comissoes')

  const loja_id = meuMembro.loja_id as string
  const lojaRaw = meuMembro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const { mes, mesLabel } = mesAtualFmt()

  // Busca vendedoras da loja
  const { data: membrosVendedoras } = await supabase
    .from('membros_loja')
    .select('perfil_id, perfis(nome)')
    .eq('loja_id', loja_id)
    .eq('role', 'vendedora')
    .eq('ativo', true)

  const vendedorasBase = (membrosVendedoras ?? []).map(m => {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }>
    const perfil = Array.isArray(p) ? p[0] : p
    return { id: m.perfil_id as string, nome: perfil?.nome ?? 'Sem nome' }
  })

  // Seção 1: Comissão padrão
  const { data: regras } = await supabase
    .from('regras_comissao')
    .select('vendedora_id, percentual')
    .eq('loja_id', loja_id)
    .eq('ativo', true)

  const regrasPorId: Record<string, number> = Object.fromEntries(
    (regras ?? []).map(r => [r.vendedora_id as string, r.percentual as number])
  )

  const vendedoras: VendedoraComissao[] = vendedorasBase.map(v => ({
    perfil_id: v.id,
    nome: v.nome,
    percentual: regrasPorId[v.id] ?? 0,
  }))

  // Seção 2: Metas mensais
  const { data: metasData } = await supabase
    .from('metas_vendedora')
    .select('vendedora_id, valor_meta, comissao_base, comissao_meta, multiplicador')
    .eq('loja_id', loja_id)
    .eq('mes', mes)

  const metasPorId: Record<string, VendedoraMeta['meta']> = Object.fromEntries(
    (metasData ?? []).map(m => [
      m.vendedora_id as string,
      {
        valor_meta: m.valor_meta as number,
        comissao_base: m.comissao_base as number,
        comissao_meta: m.comissao_meta as number,
        multiplicador: m.multiplicador as number | null,
      },
    ])
  )

  const vendedorasMeta: VendedoraMeta[] = vendedorasBase.map(v => ({
    perfil_id: v.id,
    nome: v.nome,
    meta: metasPorId[v.id] ?? null,
  }))

  // Seção 3: Comissão fixa por produto
  const { data: fixasData } = await supabase
    .from('comissao_fixa_produto')
    .select('id, produto_id, vendedora_id, valor_fixo, ativo, produtos(nome)')
    .eq('loja_id', loja_id)
    .order('criado_em', { ascending: true })

  const vendedorasMap: Record<string, string> = Object.fromEntries(
    vendedorasBase.map(v => [v.id, v.nome])
  )

  const regrasFixas: RegraFixa[] = (fixasData ?? []).map(f => {
    const prodRaw = f.produtos as unknown as { nome: string } | Array<{ nome: string }> | null
    const prodObj = Array.isArray(prodRaw) ? prodRaw[0] : prodRaw
    return {
      id: f.id as string,
      produto_id: f.produto_id as string,
      produto_nome: prodObj?.nome ?? '—',
      vendedora_id: f.vendedora_id as string,
      vendedora_nome: vendedorasMap[f.vendedora_id as string] ?? '—',
      valor_fixo: f.valor_fixo as number,
      ativo: f.ativo as boolean,
    }
  })

  const { data: produtosData } = await supabase
    .from('produtos')
    .select('id, nome')
    .eq('loja_id', loja_id)
    .eq('ativo', true)
    .order('nome', { ascending: true })

  const produtos = (produtosData ?? []).map(p => ({ id: p.id as string, nome: p.nome as string }))

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Comissões da equipe</h1>
        <p className="text-sm text-muted-foreground">{lojaNome}</p>
      </div>

      <ConfigComissoesClient
        vendedoras={vendedoras}
        vendedorasMeta={vendedorasMeta}
        regrasFixas={regrasFixas}
        produtos={produtos}
        vendedorasSimples={vendedorasBase}
        loja_id={loja_id}
        mes={mes}
        mesLabel={mesLabel}
      />
    </div>
  )
}
