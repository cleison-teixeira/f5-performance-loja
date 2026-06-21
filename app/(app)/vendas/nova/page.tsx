import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { FormNovaVenda } from './FormNovaVenda'

export default async function NovaVendaPage() {
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

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome')
    .eq('id', user.id)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Venda Rápida</h1>
        <p className="text-sm text-muted-foreground">
          Você ainda não pertence a nenhuma loja. Entre em contato com o administrador.
        </p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const userRole = membro.role as string

  // Produtos ativos da loja
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, preco_sugerido, foto_url, recorrente, comissionavel_recompra')
    .eq('loja_id', loja.id)
    .eq('ativo', true)
    .order('nome')

  // Vendedoras da loja (para gerente/dono selecionar)
  const { data: membrosVendedoras } = await supabase
    .from('membros_loja')
    .select('perfil_id, perfis(id, nome)')
    .eq('loja_id', loja.id)
    .eq('role', 'vendedora')
    .eq('ativo', true)

  const vendedoraIds = (membrosVendedoras ?? []).map(m => m.perfil_id as string)

  // Admin client para dados restritos (comissões)
  const admin = createAdminClient()

  // Comissão padrão das vendedoras
  const { data: regras } = vendedoraIds.length > 0
    ? await admin
        .from('regras_comissao')
        .select('vendedora_id, percentual')
        .eq('loja_id', loja.id)
        .eq('ativo', true)
        .in('vendedora_id', vendedoraIds)
    : { data: [] }

  const regrasPorId: Record<string, number> = Object.fromEntries(
    (regras ?? []).map(r => [r.vendedora_id as string, r.percentual as number])
  )

  // Comissão padrão do próprio usuário (se for vendedora)
  const { data: regraLogada } = await admin
    .from('regras_comissao')
    .select('percentual')
    .eq('loja_id', loja.id)
    .eq('vendedora_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  if (regraLogada) {
    regrasPorId[user.id] = regraLogada.percentual as number
  }

  const vendedoras = (membrosVendedoras ?? []).map(m => {
    const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
    const perfisObj = Array.isArray(p) ? p[0] : p
    return {
      id: m.perfil_id as string,
      nome: perfisObj?.nome ?? 'Vendedora sem nome',
      percentual_comissao: regrasPorId[m.perfil_id as string] ?? 0,
    }
  })

  // Comissões fixas por produto (admin para burlar RLS — vendedoras não veem regras mas precisam do preview)
  const { data: fixasData } = await admin
    .from('comissao_fixa_produto')
    .select('vendedora_id, produto_id, valor_fixo')
    .eq('loja_id', loja.id)
    .eq('ativo', true)

  // { [vendedora_id]: { [produto_id]: valor_fixo } }
  const fixasPorVendedoraProduto: Record<string, Record<string, number>> = {}
  for (const f of fixasData ?? []) {
    const vid = f.vendedora_id as string
    const pid = f.produto_id as string
    if (!fixasPorVendedoraProduto[vid]) fixasPorVendedoraProduto[vid] = {}
    fixasPorVendedoraProduto[vid][pid] = f.valor_fixo as number
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Venda Rápida</h1>
        <p className="text-sm text-muted-foreground">{loja.nome} · Registre a venda em poucos segundos.</p>
      </div>
      <FormNovaVenda
        loja_id={loja.id}
        loja_nome={loja.nome}
        userRole={userRole}
        vendedora_logada_id={user.id}
        vendedora_logada_nome={perfil?.nome ?? ''}
        vendedoras={vendedoras}
        produtos={produtos ?? []}
        fixasPorVendedoraProduto={fixasPorVendedoraProduto}
      />
    </div>
  )
}
