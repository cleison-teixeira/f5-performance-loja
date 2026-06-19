import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvisosLista } from './AvisosLista'
import type { AvisoDetalhado } from './types'

export interface CatalogoProduto {
  id: string
  nome: string
  preco_sugerido: number | null
  comissionavel_recompra: boolean
}

export default async function AvisosPage() {
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

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Avisos de hoje</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const hoje = new Date().toISOString().split('T')[0]

  // Avisos pendentes
  const { data: avisosRaw } = await supabase
    .from('avisos')
    .select(`
      id, data_aviso, status, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao,
      clientes(nome, whatsapp),
      mensagens_produto(tipo),
      itens_venda(produto_nome, produto_id, produtos(foto_url)),
      vendas(valor)
    `)
    .eq('loja_id', loja.id)
    .eq('status', 'pendente')
    .order('data_aviso', { ascending: true })

  // Catálogo de produtos para o form de recompra
  const { data: catalogoRaw } = await supabase
    .from('produtos')
    .select('id, nome, preco_sugerido, comissionavel_recompra')
    .eq('loja_id', loja.id)
    .eq('ativo', true)
    .order('nome')

  const catalogo: CatalogoProduto[] = (catalogoRaw ?? []).map(p => ({
    id: p.id as string,
    nome: p.nome as string,
    preco_sugerido: p.preco_sugerido as number | null,
    comissionavel_recompra: (p as unknown as { comissionavel_recompra: boolean }).comissionavel_recompra ?? true,
  }))

  // Percentuais de comissão das vendedoras que aparecem nos avisos
  const vendedoraIds = [...new Set((avisosRaw ?? []).map(a => a.vendedora_id as string).filter(Boolean))]
  const percentuaisPorVendedora: Record<string, number> = {}

  if (vendedoraIds.length > 0) {
    const { data: regras } = await supabase
      .from('regras_comissao')
      .select('vendedora_id, percentual')
      .in('vendedora_id', vendedoraIds)
      .eq('loja_id', loja.id)
      .eq('ativo', true)

    for (const r of regras ?? []) {
      percentuaisPorVendedora[r.vendedora_id as string] = r.percentual as number
    }
  }

  // Normaliza os dados
  const avisos: AvisoDetalhado[] = (avisosRaw ?? []).map(a => {
    const cliente = a.clientes as unknown as { nome: string; whatsapp: string } | null
    const mensagem = a.mensagens_produto as unknown as { tipo: string } | null
    const itemVenda = a.itens_venda as unknown as {
      produto_nome: string
      produto_id: string | null
      produtos: { foto_url: string | null } | Array<{ foto_url: string | null }> | null
    } | null
    const produtosRaw = itemVenda?.produtos
    const produtoFoto = Array.isArray(produtosRaw) ? produtosRaw[0] : produtosRaw
    const venda = a.vendas as unknown as { valor: number } | null

    return {
      id: a.id as string,
      data_aviso: a.data_aviso as string,
      status: a.status as 'pendente' | 'enviado' | 'ignorado',
      texto_renderizado: a.texto_renderizado as string,
      cliente_nome: cliente?.nome ?? 'Cliente',
      cliente_whatsapp: cliente?.whatsapp ?? '',
      cliente_id: a.cliente_id as string,
      produto_nome: itemVenda?.produto_nome ?? 'Produto',
      produto_id: itemVenda?.produto_id ?? null,
      produto_foto_url: produtoFoto?.foto_url ?? null,
      tipo: (mensagem?.tipo ?? 'agradecimento') as AvisoDetalhado['tipo'],
      valor_venda: venda?.valor ?? 0,
      previsao_comissao: (a.previsao_comissao as number | null) ?? 0,
      venda_id: a.venda_id as string,
      vendedora_id: a.vendedora_id as string,
      atrasado: a.data_aviso < hoje,
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Avisos de hoje</h1>
        <p className="text-sm text-muted-foreground">{loja.nome}</p>
      </div>
      <AvisosLista
        avisos={avisos}
        hoje={hoje}
        catalogo={catalogo}
        percentuaisPorVendedora={percentuaisPorVendedora}
        loja_id={loja.id}
      />
    </div>
  )
}
