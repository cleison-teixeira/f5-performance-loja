export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAppContext } from '@/lib/app/contexto'
import { ProdutosPageClient } from './ProdutosPageClient'
import type { ProdutoCard } from './ProdutosLista'
import { measureAsync } from '@/lib/performance/timing'

export default async function ProdutosPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { role: userRole, ctx } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Produtos recorrentes</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const admin = createAdminClient()

  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(userRole) && ctx.escopo === 'loja'
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'} · Configure ciclo, preço médio e mensagens de recompra.`
    : `${ctx.lojaNome} · Configure ciclo, preço médio e mensagens de recompra.`

  const { data: produtosRaw } = await measureAsync('produtos:queries', () =>
    admin
      .from('produtos')
      .select('id, nome, preco_sugerido, foto_url, recorrente, qtd_mensagens, loja_id, nicho, parceiro, categoria, galeria_urls, variantes, mensagens_produto(tipo, dias_apos_venda)')
      .in('loja_id', ctx.lojaIds)
      .eq('ativo', true)
      .order('nome')
      .limit(50)
  )

  type ProdutoRaw = {
    id: string
    nome: string
    preco_sugerido: number | null
    foto_url: string | null
    recorrente: boolean
    qtd_mensagens: number | null
    loja_id: string
    nicho: string | null
    parceiro: string | null
    categoria: string | null
    galeria_urls: string[] | null
    variantes: string[] | null
    mensagens_produto: Array<{ tipo: string; dias_apos_venda: number }>
  }

  const lista: ProdutoCard[] = ((produtosRaw ?? []) as unknown as ProdutoRaw[]).map(p => ({
    ...p,
    lojaNome: mostrarLoja ? (lojaNomeMap.get(p.loja_id) ?? '') : null,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Produtos recorrentes</h1>
          <p className="text-sm text-muted-foreground">{subtitulo}</p>
        </div>
        {podeEditar && (
          <Link href="/configuracoes/produtos" className="shrink-0 text-sm text-primary hover:underline whitespace-nowrap">
            Gerenciar →
          </Link>
        )}
      </div>

      {podeEditar && (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2 leading-relaxed">
          Use esta tela para consultar produtos. Para editar, acesse{' '}
          <Link href="/configuracoes/produtos" className="text-primary hover:underline">
            Produtos e mensagens
          </Link>.
        </p>
      )}

      {mostrarLoja && (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2 leading-relaxed">
          Para gerenciar produtos de uma loja, selecione-a no seletor <strong>Visão</strong> acima.
        </p>
      )}

      <ProdutosPageClient
        initialLista={lista}
        initialNextCursor={((produtosRaw ?? []).length) === 50 ? '50' : null}
        podeEditar={podeEditar}
      />
    </div>
  )
}
