import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'

function formatarData(iso: string): string {
  const date = iso.split('T')[0]
  const [ano, mes, dia] = date.split('-')
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {lojaNome} · Clientes cadastrados automaticamente pelas vendas da loja.
        </p>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{comCompras}</p>
            <p className="text-xs text-muted-foreground">Com compras</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-muted-foreground">{semCompras}</p>
            <p className="text-xs text-muted-foreground">Sem compras</p>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">Nenhum cliente ainda</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Os clientes aparecem aqui automaticamente quando uma venda é registrada pela Venda Rápida.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {clientes.map(c => (
            <li key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{formatarWhatsApp(c.whatsapp)}</p>
                </div>
                {c.qtd > 0 ? (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
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
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
                {c.qtd > 0 && c.ultima && (
                  <p className="text-xs text-muted-foreground">
                    Última compra: {formatarData(c.ultima)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Cadastrado em {formatarData(c.criado_em)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
