import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect, notFound } from 'next/navigation'
import { FormEditarVenda } from './FormEditarVenda'
import { isContaEstrutural } from '@/lib/acessos/filtrar-membros'

export interface ItemEditarInicial {
  item_venda_id: string
  produto_id: string | null
  produto_nome: string
  quantidade: number
  preco_unitario: number
  recorrente: boolean
  comissionavel: boolean
}

export default async function EditarVendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

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

  if (!membro) redirect('/vendas')

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const loja_id = loja.id
  const loja_nome = loja.nome
  const userRole = membro.role as string
  const isVendedora = userRole === 'vendedora'

  // Buscar a venda com todos os dados necessários
  const { data: venda } = await supabase
    .from('vendas')
    .select(`
      id, data_compra, vendedora_id, origem, loja_id,
      clientes(nome, whatsapp),
      perfis!vendas_vendedora_id_fkey(nome),
      itens_venda(id, produto_id, produto_nome, quantidade, valor_unitario, subtotal, recorrente, comissionavel)
    `)
    .eq('id', id)
    .eq('loja_id', loja_id)
    .single()

  if (!venda) notFound()

  // Só vendas manuais são editáveis
  if ((venda as unknown as { origem: string }).origem !== 'venda_manual') {
    redirect('/vendas')
  }

  const clienteRaw = venda.clientes as unknown as { nome: string; whatsapp: string } | null
  const perfilRaw = venda.perfis as unknown as { nome: string } | null
  const itensRaw = venda.itens_venda as unknown as Array<{
    id: string
    produto_id: string | null
    produto_nome: string
    quantidade: number
    valor_unitario: number
    subtotal: number
    recorrente: boolean
    comissionavel: boolean
  }> | null

  const itens: ItemEditarInicial[] = (itensRaw ?? []).map(i => ({
    item_venda_id: i.id,
    produto_id: i.produto_id ?? null,
    produto_nome: i.produto_nome,
    quantidade: i.quantidade,
    preco_unitario: i.valor_unitario,
    recorrente: i.recorrente ?? false,
    comissionavel: i.comissionavel ?? true,
  }))

  // Catálogo de produtos para adicionar novos
  const { data: catalogoRaw } = await supabase
    .from('produtos')
    .select('id, nome, preco_sugerido, comissionavel_recompra')
    .eq('loja_id', loja_id)
    .eq('ativo', true)
    .order('nome')

  const catalogo = (catalogoRaw ?? []).map(p => ({
    id: p.id as string,
    nome: p.nome as string,
    preco_sugerido: p.preco_sugerido as number | null,
    comissionavel_recompra: (p as unknown as { comissionavel_recompra: boolean }).comissionavel_recompra ?? true,
  }))

  // Vendedoras disponíveis (para gerente/dono)
  let vendedoras: { id: string; nome: string }[] = []
  if (!isVendedora) {
    const admin = createAdminClient()
    const [{ data: membros }, lojaLibRes] = await Promise.all([
      supabase
        .from('membros_loja')
        .select('perfil_id, role, perfis(nome)')
        .eq('loja_id', loja_id)
        .in('role', ['dono', 'gerente', 'lider', 'vendedora'])
        .eq('ativo', true),
      admin
        .from('liberacoes_acesso')
        .select('email')
        .eq('loja_id', loja_id)
        .eq('tipo', 'loja')
        .order('criado_em', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    const lojaEmail = (lojaLibRes.data?.email as string | null) ?? null

    // Buscar auth email dos donos para Critério 2 (email perfil === email loja)
    const donoIdsE = [...new Set(
      (membros ?? [])
        .filter(m => (m as unknown as { role: string }).role === 'dono')
        .map(m => m.perfil_id as string)
    )]
    const donoAuthEmailsE: Record<string, string> = {}
    if (donoIdsE.length > 0) {
      await Promise.all(donoIdsE.map(async pid => {
        const { data } = await admin.auth.admin.getUserById(pid)
        if (data?.user?.email) donoAuthEmailsE[pid] = data.user.email
      }))
    }

    vendedoras = (membros ?? []).flatMap(m => {
      const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }>
      const perfil = Array.isArray(p) ? p[0] : p
      const nome = perfil?.nome ?? 'Sem nome'
      const role = (m as unknown as { role: string }).role
      const perfilEmail = donoAuthEmailsE[m.perfil_id as string] ?? null
      if (isContaEstrutural({ role, perfilNome: nome, perfilEmail, lojaNome: loja_nome, lojaEmail })) return []
      return [{ id: m.perfil_id as string, nome }]
    })
  }

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-semibold">Editar compra</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja_nome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1">
          Cliente: <span className="font-medium text-foreground/80">{clienteRaw?.nome ?? '—'}</span>
          {clienteRaw?.whatsapp && <span className="ml-2 text-muted-foreground/50">{clienteRaw.whatsapp}</span>}
        </p>
      </div>

      <FormEditarVenda
        venda_id={id}
        loja_id={loja_id}
        loja_nome={loja_nome}
        data_compra={(venda as unknown as { data_compra: string }).data_compra ?? ''}
        vendedora_atual_id={venda.vendedora_id as string}
        vendedora_atual_nome={perfilRaw?.nome ?? '—'}
        isVendedora={isVendedora}
        itens_iniciais={itens}
        catalogo={catalogo}
        vendedoras={vendedoras}
      />
    </div>
  )
}
