export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'
import { FormNovaVenda } from './FormNovaVenda'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function NovaVendaPage() {
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

  if (ctx.escopo === 'rede') {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Registrar compra para recompra</h1>
        <p className="text-sm text-muted-foreground">
          Selecione uma loja no seletor acima para registrar uma compra.
        </p>
      </div>
    )
  }

  if (!ctx.lojaId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Registrar compra para recompra</h1>
        <p className="text-sm text-muted-foreground">
          Você ainda não pertence a nenhuma loja. Entre em contato com o administrador.
        </p>
      </div>
    )
  }

  // Parallelizar queries independentes após ctx
  const [perfilRes, produtosRes, membrosRes, fixasRes] = await Promise.all([
    supabase.from('perfis').select('nome').eq('id', user.id).single(),
    supabase
      .from('produtos')
      .select('id, nome, preco_sugerido, foto_url, recorrente, comissionavel_recompra, qtd_mensagens, mensagens:mensagens_produto(tipo, dias_apos_venda)')
      .eq('loja_id', ctx.lojaId)
      .eq('ativo', true)
      .order('nome'),
    admin
      .from('membros_loja')
      .select('perfil_id, perfis(id, nome)')
      .eq('loja_id', ctx.lojaId)
      .eq('ativo', true),
    admin
      .from('comissao_fixa_produto')
      .select('vendedora_id, produto_id, valor_fixo')
      .eq('loja_id', ctx.lojaId)
      .eq('ativo', true),
  ])

  const perfil = perfilRes.data
  const produtos = produtosRes.data
  const membrosVendedoras = membrosRes.data
  const fixasData = fixasRes.data

  const produtosMapeados = (produtos ?? []).map(p => {
    const recompraMsg = (p.mensagens as any)?.find((m: any) => m.tipo === 'recompra')
    return {
      id: p.id,
      nome: p.nome,
      preco_sugerido: p.preco_sugerido,
      foto_url: p.foto_url,
      recorrente: p.recorrente,
      comissionavel_recompra: p.comissionavel_recompra,
      qtd_mensagens: (p as any).qtd_mensagens ?? 3,
      ciclo_padrao: recompraMsg?.dias_apos_venda ?? 30
    }
  })

  const vendedoraIds = (membrosVendedoras ?? []).map(m => m.perfil_id as string)

  // Comissão padrão das vendedoras — parallelizar as duas queries de regras
  const [regrasRes, regraLogadaRes] = await Promise.all([
    vendedoraIds.length > 0
      ? admin
          .from('regras_comissao')
          .select('vendedora_id, percentual')
          .eq('loja_id', ctx.lojaId)
          .eq('ativo', true)
          .in('vendedora_id', vendedoraIds)
      : Promise.resolve({ data: [] as Array<{ vendedora_id: unknown; percentual: unknown }> }),
    admin
      .from('regras_comissao')
      .select('percentual')
      .eq('loja_id', ctx.lojaId)
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

  const vendedoras = (membrosVendedoras ?? []).map(m => {
    const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
    const perfisObj = Array.isArray(p) ? p[0] : p
    return {
      id: m.perfil_id as string,
      nome: perfisObj?.nome ?? 'Vendedora sem nome',
      percentual_comissao: regrasPorId[m.perfil_id as string] ?? 0,
    }
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
        <p className="text-sm text-muted-foreground">{ctx.lojaNome} · Cadastre uma compra recorrente para o F5 avisar a equipe na hora certa.</p>
      </div>
      <FormNovaVenda
        loja_id={ctx.lojaId}
        loja_nome={ctx.lojaNome}
        vendedora_logada_id={user.id}
        vendedora_logada_nome={perfil?.nome ?? ''}
        vendedoras={vendedoras}
        produtos={produtosMapeados}
        fixasPorVendedoraProduto={fixasPorVendedoraProduto}
      />
    </div>
  )
}
