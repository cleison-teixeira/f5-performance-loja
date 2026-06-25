export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function cicloRecompra(mensagens: Array<{ tipo: string; dias_apos_venda: number }>): number | null {
  if (mensagens.length === 0) return null
  const recompra = mensagens.find(m => m.tipo === 'recompra')
  if (recompra) return recompra.dias_apos_venda
  return Math.max(...mensagens.map(m => m.dias_apos_venda))
}

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function ProdutosPage() {
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
        <h1 className="text-xl font-semibold">Produtos recorrentes</h1>
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
        <h1 className="text-xl font-semibold">Produtos recorrentes</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  // Edição de produtos requer loja específica
  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(userRole) && ctx.escopo === 'loja'
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'} · Configure ciclo, preço médio e mensagens de recompra.`
    : `${ctx.lojaNome} · Configure ciclo, preço médio e mensagens de recompra.`

  const { data: produtos } = await admin
    .from('produtos')
    .select('id, nome, preco_sugerido, foto_url, recorrente, qtd_mensagens, loja_id, mensagens_produto(tipo, dias_apos_venda)')
    .in('loja_id', ctx.lojaIds)
    .eq('ativo', true)
    .order('nome')

  type ProdutoRaw = {
    id: string
    nome: string
    preco_sugerido: number | null
    foto_url: string | null
    recorrente: boolean
    qtd_mensagens: number | null
    loja_id: string
    mensagens_produto: Array<{ tipo: string; dias_apos_venda: number }>
  }

  const lista = (produtos ?? []) as unknown as ProdutoRaw[]

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

      {lista.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-2">
          <p className="text-sm font-medium">Nenhum produto ativo cadastrado.</p>
          {podeEditar && (
            <p className="text-xs text-muted-foreground">
              Cadastre produtos em{' '}
              <Link href="/configuracoes/produtos" className="text-primary hover:underline">
                Produtos e mensagens
              </Link>.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map(p => {
            const mensagens = Array.isArray(p.mensagens_produto) ? p.mensagens_produto : []
            const dias = p.recorrente ? cicloRecompra(mensagens) : null
            const qtd = p.qtd_mensagens ?? mensagens.length
            const lojaNome = mostrarLoja ? (lojaNomeMap.get(p.loja_id) ?? '') : null

            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-2.5">
                <div className="flex items-start gap-3">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_url}
                      alt={p.nome}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-sm font-semibold">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{p.nome}</p>
                      {p.preco_sugerido != null && (
                        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                          {formatarBRL(p.preco_sugerido)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {p.recorrente ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          Recompra
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          Pontual
                        </span>
                      )}
                      <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        Ativo
                      </span>
                      {lojaNome && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {lojaNome}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.recorrente && (
                  <div className="text-xs text-muted-foreground border-t pt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {dias != null ? (
                      <span>
                        Recompra em{' '}
                        <strong className="text-foreground">{dias} dias</strong>
                      </span>
                    ) : (
                      <span>Sem ciclo de recompra definido</span>
                    )}
                    {qtd > 0 ? (
                      <span>
                        {qtd} aviso{qtd !== 1 ? 's' : ''} configurado{qtd !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span>Sem avisos configurados</span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
