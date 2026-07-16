export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { isContaEstrutural } from '@/lib/acessos/filtrar-membros'
import { getContextoLoja } from '@/lib/loja/contexto'
import { FormNovaVenda, type CampanhaProdutoInfo, type CampanhaPreSelecionada } from './FormNovaVenda'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ produto_id?: string; campanha_id?: string; campanha_item_id?: string }>
}) {
  const params = await searchParams
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
        <h1 className="text-xl font-semibold">Registrar compra para recompra</h1>
        <p className="text-sm text-muted-foreground">
          Você ainda não pertence a nenhuma loja. Entre em contato com o administrador.
        </p>
      </div>
    )
  }

  const userRole = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const multiLoja = !isAcessoLoja(userRole)
  const ctx = await getContextoLoja(user.id, multiLoja)

  const lojaId = ctx.lojaId ?? ctx.lojas[0]?.id ?? null
  const lojaNome = ctx.lojaId ? ctx.lojaNome : (ctx.lojas[0]?.nome ?? '')

  if (!lojaId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Registrar compra para recompra</h1>
        <p className="text-sm text-muted-foreground">
          Você ainda não pertence a nenhuma loja. Entre em contato com o administrador.
        </p>
      </div>
    )
  }

  const hj = new Date().toISOString().slice(0, 10)

  // Parallelizar queries independentes após ctx
  const [perfilRes, produtosRes, membrosRes, fixasRes, lojaEmailRes, campanhaItensRes] = await Promise.all([
    supabase.from('perfis').select('nome').eq('id', user.id).single(),
    admin
      .from('produtos')
      .select('id, nome, preco_sugerido, foto_url, recorrente, comissionavel_recompra, qtd_mensagens')
      .eq('loja_id', lojaId)
      .eq('ativo', true)
      .order('nome'),
    admin
      .from('membros_loja')
      .select('perfil_id, role, perfis(id, nome)')
      .eq('loja_id', lojaId)
      .in('role', ['dono', 'gerente', 'lider', 'vendedora'])
      .eq('ativo', true),
    admin
      .from('comissao_fixa_produto')
      .select('vendedora_id, produto_id, valor_fixo')
      .eq('loja_id', lojaId)
      .eq('ativo', true),
    admin
      .from('liberacoes_acesso')
      .select('email')
      .eq('loja_id', lojaId)
      .eq('tipo', 'loja')
      .order('criado_em', { ascending: true }),
    admin
      .from('campanhas_venda_itens')
      .select('id, produto_id, preco_campanha, campanha_id, campanhas_venda!inner(id, nome, status, data_inicio, data_fim, loja_id)')
      .eq('campanhas_venda.loja_id', lojaId)
      .eq('campanhas_venda.status', 'ativa')
      .lte('campanhas_venda.data_inicio', hj)
      .gte('campanhas_venda.data_fim', hj)
      .eq('ativo', true),
  ])

  const perfil = perfilRes.data
  const produtos = produtosRes.data
  const membrosVendedoras = membrosRes.data
  const fixasData = fixasRes.data

  // Buscar ciclo real de cada produto via admin (tipo='recompra') — imune a RLS
  const produtoIds = (produtos ?? []).map(p => p.id as string)
  const cicloMap: Record<string, number> = {}
  if (produtoIds.length > 0) {
    const { data: recomprasData } = await admin
      .from('mensagens_produto')
      .select('produto_id, dias_apos_venda')
      .eq('tipo', 'recompra')
      .in('produto_id', produtoIds)
    for (const r of recomprasData ?? []) {
      const dias = r.dias_apos_venda as number
      if (dias > 0) cicloMap[r.produto_id as string] = dias
    }
  }

  const produtosMapeados = (produtos ?? []).map(p => ({
    id: p.id,
    nome: p.nome,
    preco_sugerido: p.preco_sugerido,
    foto_url: p.foto_url,
    recorrente: p.recorrente,
    comissionavel_recompra: p.comissionavel_recompra,
    qtd_mensagens: (p as any).qtd_mensagens ?? 3,
    ciclo_padrao: cicloMap[p.id as string] ?? 30,
  }))

  // Construir mapa produto_id → campanha (apenas campanhas ativas da loja)
  const campanhaProdutoMap: Record<string, CampanhaProdutoInfo> = {}
  for (const row of (campanhaItensRes.data ?? []) as unknown[]) {
    const r = row as Record<string, unknown>
    const cv = r.campanhas_venda as Record<string, unknown>
    const prodId = r.produto_id as string
    if (!campanhaProdutoMap[prodId]) {
      campanhaProdutoMap[prodId] = {
        campanhaId: cv.id as string,
        campanhaItemId: r.id as string,
        campanhaNome: cv.nome as string,
        preco: Number(r.preco_campanha),
      }
    }
  }

  // Validar e montar pré-seleção de campanha a partir dos query params
  let campanhaPreSelecionada: CampanhaPreSelecionada | null = null
  const paramCampanhaId = params.campanha_id
  const paramProdutoId = params.produto_id

  if (paramCampanhaId) {
    // Verificar se a campanha está válida (está no mapa = ativa, da loja correta, no período)
    const entradaCampanha = Object.values(campanhaProdutoMap).find(v => v.campanhaId === paramCampanhaId)

    if (entradaCampanha) {
      if (paramProdutoId && campanhaProdutoMap[paramProdutoId]?.campanhaId === paramCampanhaId) {
        // Único SKU pré-selecionado via URL
        const info = campanhaProdutoMap[paramProdutoId]
        campanhaPreSelecionada = {
          campanhaId: info.campanhaId,
          campanhaNome: info.campanhaNome,
          produtoId: paramProdutoId,
          campanhaItemId: info.campanhaItemId,
          preco: info.preco,
        }
      } else if (!paramProdutoId) {
        // Multi-SKU: montar picker com todos os itens da campanha
        const itensParaPicker = Object.entries(campanhaProdutoMap)
          .filter(([, v]) => v.campanhaId === paramCampanhaId)
          .map(([prodId, v]) => {
            const produto = produtosMapeados.find(p => p.id === prodId)
            return {
              id: v.campanhaItemId,
              produto_id: prodId,
              produto_nome: produto?.nome ?? '',
              preco_campanha: v.preco,
            }
          })
          .filter(i => i.produto_nome !== '')

        if (itensParaPicker.length > 0) {
          campanhaPreSelecionada = {
            campanhaId: paramCampanhaId,
            campanhaNome: entradaCampanha.campanhaNome,
            itensParaPicker,
          }
        }
      }
    }
  }

  const vendedoraIds = (membrosVendedoras ?? []).map(m => m.perfil_id as string)

  // Comissão padrão das vendedoras — parallelizar as duas queries de regras
  const [regrasRes, regraLogadaRes] = await Promise.all([
    vendedoraIds.length > 0
      ? admin
          .from('regras_comissao')
          .select('vendedora_id, percentual')
          .eq('loja_id', lojaId)
          .eq('ativo', true)
          .in('vendedora_id', vendedoraIds)
      : Promise.resolve({ data: [] as Array<{ vendedora_id: unknown; percentual: unknown }> }),
    admin
      .from('regras_comissao')
      .select('percentual')
      .eq('loja_id', lojaId)
      .eq('vendedora_id', user.id)
      .eq('ativo', true)
      .maybeSingle(),
  ])

  const regrasPorId: Record<string, number> = Object.fromEntries(
    (regrasRes.data ?? []).map(r => [r.vendedora_id as string, r.percentual as number])
  )

  const regraLogada = regraLogadaRes.data
  if (regraLogada) {
    regrasPorId[user.id] = regraLogada.percentual as number
  }

  // Buscar auth email dos donos para Critério 2 (email perfil === email loja)
  const donoIds = [...new Set(
    (membrosVendedoras ?? [])
      .filter(m => (m as unknown as { role: string }).role === 'dono')
      .map(m => m.perfil_id as string)
  )]
  const donoAuthEmails: Record<string, string> = {}
  if (donoIds.length > 0) {
    await Promise.all(donoIds.map(async pid => {
      const { data } = await admin.auth.admin.getUserById(pid)
      if (data?.user?.email) donoAuthEmails[pid] = data.user.email
    }))
  }

  const lojaLibEmails = ((lojaEmailRes as { data: Array<{ email: string }> | null }).data ?? []).map(r => r.email as string).filter(Boolean)
  const lojaEmail = lojaLibEmails[0] ?? null
  const vendedoras = (membrosVendedoras ?? []).flatMap(m => {
    const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
    const perfisObj = Array.isArray(p) ? p[0] : p
    const nome = perfisObj?.nome ?? 'Vendedora sem nome'
    const role = (m as unknown as { role: string }).role
    const perfilEmail = donoAuthEmails[m.perfil_id as string] ?? null
    if (isContaEstrutural({ role, perfilNome: nome, perfilEmail, lojaNome, lojaEmail, lojaLibEmails })) return []
    return [{
      id: m.perfil_id as string,
      nome,
      percentual_comissao: regrasPorId[m.perfil_id as string] ?? 0,
    }]
  })

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
        <h1 className="text-xl font-semibold">Registrar compra para recompra</h1>
        <p className="text-sm text-muted-foreground">{lojaNome} · Cadastre uma compra recorrente para o F5 avisar a equipe na hora certa.</p>
      </div>
      <FormNovaVenda
        loja_id={lojaId}
        loja_nome={lojaNome}
        vendedora_logada_id={user.id}
        vendedora_logada_nome={perfil?.nome ?? ''}
        vendedoras={vendedoras}
        produtos={produtosMapeados}
        fixasPorVendedoraProduto={fixasPorVendedoraProduto}
        campanhaProdutoMap={campanhaProdutoMap}
        campanhaPreSelecionada={campanhaPreSelecionada}
      />
    </div>
  )
}
