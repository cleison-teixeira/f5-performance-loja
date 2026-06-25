export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'
import { AvisosLista } from '@/app/(app)/avisos/AvisosLista'
import type { AvisoDetalhado } from '@/app/(app)/avisos/types'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function RelacionamentoPage() {
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
        <h1 className="text-xl font-semibold">Relacionamento</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const userRole = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const multiLoja = !isAcessoLoja(userRole)
  const ctx = await getContextoLoja(user.id, multiLoja)

  if (ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Relacionamento</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const mostrarLoja = ctx.escopo === 'rede'
  const hoje = new Date().toISOString().split('T')[0]
  const isVendedora = false

  const lojaIdFallback = ctx.lojaId ?? ctx.lojaIds[0]

  const { data: avisosRaw } = await admin
    .from('avisos')
    .select(`
      id, loja_id, data_aviso, status, recompra_id, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao,
      clientes(nome, whatsapp),
      mensagens_produto(tipo),
      itens_venda(produto_nome, produto_id, subtotal, produtos(foto_url)),
      vendas(valor)
    `)
    .in('loja_id', ctx.lojaIds)
    .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
    .order('data_aviso', { ascending: true })

  const { data: membrosAtivos } = await admin
    .from('membros_loja')
    .select('perfil_id, perfis(nome)')
    .in('loja_id', ctx.lojaIds)
    .eq('ativo', true)

  const vendedoraNomeMap = new Map<string, string>()
  for (const m of membrosAtivos ?? []) {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }> | null
    const perfil = Array.isArray(p) ? p[0] : p
    if (perfil?.nome) vendedoraNomeMap.set(m.perfil_id as string, perfil.nome)
  }

  const vendedorasLoja = (membrosAtivos ?? []).map(m => ({
    id: m.perfil_id as string,
    nome: vendedoraNomeMap.get(m.perfil_id as string) ?? '—',
    percentual: 0,
  }))

  const avisos: AvisoDetalhado[] = (avisosRaw ?? []).filter(a => {
    const mp = a.mensagens_produto as unknown as { tipo: string } | null
    const tipo = mp?.tipo ?? ''
    return tipo === 'agradecimento' || tipo === 'relacionamento'
  }).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as {
      produto_nome: string
      produto_id: string | null
      subtotal: number | null
      produtos: { foto_url: string | null } | Array<{ foto_url: string | null }> | null
    } | null
    const produtosRaw = itemVenda?.produtos
    const produtoFoto = Array.isArray(produtosRaw) ? produtosRaw[0] : produtosRaw
    const venda = a.vendas as unknown as { valor: number } | null
    const avisoLojaId = a.loja_id as string

    return {
      id: a.id as string,
      data_aviso: a.data_aviso as string,
      status: a.status as AvisoDetalhado['status'],
      recompra_id: (a as unknown as { recompra_id: string | null }).recompra_id ?? null,
      texto_renderizado: a.texto_renderizado as string,
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      cliente_id: a.cliente_id as string,
      produto_nome: itemVenda?.produto_nome ?? 'Produto',
      produto_id: itemVenda?.produto_id ?? null,
      produto_foto_url: produtoFoto?.foto_url ?? null,
      tipo: (mensagem?.tipo ?? 'agradecimento') as AvisoDetalhado['tipo'],
      valor_venda: venda?.valor ?? 0,
      valor_produto: itemVenda?.subtotal ?? 0,
      previsao_comissao: 0,
      venda_id: a.venda_id as string,
      item_venda_id: (a.item_venda_id as string | null) ?? null,
      data_compra: '',
      observacao_resultado: null,
      vendedora_id: a.vendedora_id as string,
      vendedora_nome: vendedoraNomeMap.get(a.vendedora_id as string) ?? '',
      atrasado: a.data_aviso < hoje,
      loja_id: avisoLojaId,
      loja_nome: lojaNomeMap.get(avisoLojaId) ?? '',
    }
  })

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Relacionamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{ctx.lojaNome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Mensagens de contato para manter o cliente aquecido.
        </p>
      </div>

      {/* ── Lista (sem catálogo nem percentuais — não há ação de venda aqui) ── */}
      <AvisosLista
        avisos={avisos}
        hoje={hoje}
        catalogo={[]}
        percentuaisPorVendedora={{}}
        vendedorasLoja={vendedorasLoja}
        loja_id={lojaIdFallback}
        isVendedora={isVendedora}
        mode="relacionamento"
        mostrarLoja={mostrarLoja}
      />

    </div>
  )
}
