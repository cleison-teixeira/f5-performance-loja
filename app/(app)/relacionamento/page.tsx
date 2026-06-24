import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvisosLista } from '@/app/(app)/avisos/AvisosLista'
import type { AvisoDetalhado } from '@/app/(app)/avisos/types'

export default async function RelacionamentoPage() {
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
        <h1 className="text-xl font-semibold">Relacionamento</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
  const hoje = new Date().toISOString().split('T')[0]
  const isVendedora = (membro.role as string) === 'vendedora'

  let avisosQuery = supabase
    .from('avisos')
    .select(`
      id, data_aviso, status, recompra_id, texto_renderizado, venda_id, item_venda_id, vendedora_id, cliente_id, previsao_comissao,
      clientes(nome, whatsapp),
      mensagens_produto(tipo),
      itens_venda(produto_nome, produto_id, subtotal, produtos(foto_url)),
      vendas(valor)
    `)
    .eq('loja_id', loja.id)
    .or('status.in.(pendente,aberta,contato_feito,reagendada),and(status.eq.enviado,recompra_id.is.null)')
    .order('data_aviso', { ascending: true })
  if (isVendedora) avisosQuery = avisosQuery.eq('vendedora_id', user!.id)
  const { data: avisosRaw } = await avisosQuery

  // Nomes das vendedoras visíveis nos cards
  const vendedoraIds = [...new Set((avisosRaw ?? []).map(a => a.vendedora_id as string).filter(Boolean))]
  const vendedoraNomeMap = new Map<string, string>()
  if (vendedoraIds.length > 0) {
    const { data: perfisData } = await supabase
      .from('perfis')
      .select('id, nome')
      .in('id', vendedoraIds)
    for (const p of perfisData ?? []) {
      vendedoraNomeMap.set(p.id as string, p.nome as string)
    }
  }

  // Filtra apenas agradecimento/relacionamento
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
    }
  })

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Relacionamento</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{loja.nome}</p>
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
        loja_id={loja.id}
        isVendedora={isVendedora}
        mode="relacionamento"
      />

    </div>
  )
}
