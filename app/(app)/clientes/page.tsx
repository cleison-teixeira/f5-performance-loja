import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, UserMinus } from 'lucide-react'

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('T')[0].split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function formatarWhatsApp(w: string): string {
  const digits = w.replace(/\D/g, '')
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return w
}

function iniciais(nome: string): string {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const loja_id = membro.loja_id as string

  const [clientesRes, vendasRes] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nome, whatsapp, criado_em')
      .eq('loja_id', loja_id)
      .order('nome'),
    supabase
      .from('vendas')
      .select('cliente_id, valor, data_compra')
      .eq('loja_id', loja_id)
      .order('data_compra', { ascending: false }),
  ])

  // Agregação em memória — vendas já chegam ordenadas desc, logo a primeira
  // ocorrência por cliente é a mais recente
  type VendaStats = { qtd: number; total: number; ultima: string }
  const vendasPorCliente: Record<string, VendaStats> = {}
  for (const v of vendasRes.data ?? []) {
    const cid = v.cliente_id as string | null
    if (!cid) continue
    if (!vendasPorCliente[cid]) {
      vendasPorCliente[cid] = { qtd: 0, total: 0, ultima: v.data_compra as string }
    }
    vendasPorCliente[cid].qtd++
    vendasPorCliente[cid].total += (v.valor as number) ?? 0
  }

  const clientes = (clientesRes.data ?? []).map(c => {
    const stats = vendasPorCliente[c.id as string]
    return {
      id: c.id as string,
      nome: c.nome as string,
      whatsapp: c.whatsapp as string,
      criado_em: c.criado_em as string,
      qtd: stats?.qtd ?? 0,
      total: stats?.total ?? 0,
      ultima: stats?.ultima ?? null,
    }
  })

  const total = clientes.length
  const comCompras = clientes.filter(c => c.qtd > 0).length
  const semCompras = total - comCompras

  return (
    <div className="space-y-5 pb-6">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{lojaNome}</p>
        <p className="text-xs text-muted-foreground/65 mt-1 leading-relaxed">
          Clientes cadastrados automaticamente pelas vendas registradas na loja.
        </p>
      </div>

      {/* ── Cards de resumo ── */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

          <div className="rounded-xl border bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600/65 dark:text-blue-400/60 flex items-center gap-1.5">
              <Users className="h-3 w-3 flex-none" />
              Total de clientes
            </p>
            <p className="text-2xl font-bold tabular-nums leading-none text-blue-700 dark:text-blue-400">
              {total}
            </p>
            <p className="text-[11px] text-blue-600/55 dark:text-blue-400/50 leading-tight">
              na base da loja
            </p>
          </div>

          <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 p-4 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/65 dark:text-emerald-400/60 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 flex-none" />
              Com compras
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${comCompras > 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-muted-foreground'}`}>
              {comCompras}
            </p>
            <p className="text-[11px] text-emerald-700/55 dark:text-emerald-400/50 leading-tight">
              já compraram na loja
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 border-border/60 p-4 flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/65 flex items-center gap-1.5">
              <UserMinus className="h-3 w-3 flex-none" />
              Sem compras
            </p>
            <p className={`text-2xl font-bold tabular-nums leading-none ${semCompras > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {semCompras}
            </p>
            <p className="text-[11px] text-muted-foreground/55 leading-tight">
              sem histórico registrado
            </p>
          </div>

        </div>
      )}

      {/* ── Lista ── */}
      {total === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">Nenhum cliente ainda</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Os clientes aparecem aqui automaticamente quando uma venda é registrada pela Venda Rápida.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">Base de clientes</h2>
            <p className="text-xs text-muted-foreground">
              Ordenados por nome · {total} cliente{total !== 1 ? 's' : ''}
            </p>
          </div>

          <ul className="space-y-2">
            {clientes.map(c => (
              <li key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0 mt-0.5">
                    {iniciais(c.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{formatarWhatsApp(c.whatsapp)}</p>
                      </div>
                      {c.qtd > 0 ? (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-snug">
                            {formatarBRL(c.total)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.qtd} {c.qtd === 1 ? 'compra' : 'compras'}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground shrink-0">
                          Sem compras
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {c.qtd > 0 && c.ultima && (
                        <p className="text-xs text-muted-foreground">
                          Última compra {formatarData(c.ultima)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Cliente desde {formatarData(c.criado_em)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}
