import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ListaEsperaForm } from './ListaEsperaForm'
import { ListaEsperaCards, type RegistroListaEspera } from './ListaEsperaCards'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export default async function ListaEsperaPage() {
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
        <h1 className="text-xl font-semibold">Lista de Espera</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const loja_id = membro.loja_id as string
  const role = membro.role as string
  const isVendedora = role === 'vendedora'

  const [registrosRes, categoriasRes, vendedorasRes] = await Promise.all([
    supabase
      .from('lista_espera')
      .select('id, cliente_nome, cliente_whatsapp, produto_nome, categoria_id, categoria_nome, valor_potencial, quantidade, status, observacao, criado_em, vendedora_id')
      .eq('loja_id', loja_id)
      .order('criado_em', { ascending: false }),
    supabase
      .from('categorias')
      .select('id, nome')
      .eq('loja_id', loja_id)
      .eq('ativa', true)
      .order('nome'),
    isVendedora
      ? Promise.resolve({ data: [] as Array<{ perfil_id: unknown; perfis: unknown }> })
      : supabase
          .from('membros_loja')
          .select('perfil_id, perfis(id, nome)')
          .eq('loja_id', loja_id)
          .eq('role', 'vendedora')
          .eq('ativo', true),
  ])

  // Categoria name map for display
  const categoriaMap: Record<string, string> = {}
  for (const c of categoriasRes.data ?? []) {
    categoriaMap[c.id as string] = c.nome as string
  }

  // Vendedora names for dono/gerente display
  const nomeMap: Record<string, string> = {}
  if (!isVendedora) {
    const ids = [...new Set((registrosRes.data ?? []).map(r => r.vendedora_id as string).filter(Boolean))]
    if (ids.length > 0) {
      const { data: perfisData } = await supabase
        .from('perfis')
        .select('id, nome')
        .in('id', ids)
      for (const p of perfisData ?? []) nomeMap[p.id as string] = p.nome as string
    }
  }

  const registros: RegistroListaEspera[] = (registrosRes.data ?? []).map(r => ({
    id: r.id as string,
    cliente_nome: r.cliente_nome as string,
    cliente_whatsapp: r.cliente_whatsapp as string,
    produto_nome: r.produto_nome as string,
    categoria_nome:
      (r.categoria_id ? categoriaMap[r.categoria_id as string] : null) ??
      (r.categoria_nome as string | null),
    valor_potencial: r.valor_potencial as number | null,
    quantidade: (r.quantidade as number) ?? 1,
    status: r.status as string,
    observacao: r.observacao as string | null,
    criado_em: r.criado_em as string,
    vendedora_nome: !isVendedora ? (nomeMap[r.vendedora_id as string] ?? '—') : undefined,
  }))

  const vendedoras = isVendedora
    ? []
    : (vendedorasRes.data ?? []).map(m => {
        const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
        const perfil = Array.isArray(p) ? p[0] : p
        return { id: m.perfil_id as string, nome: perfil?.nome ?? '—' }
      })

  const defaultVendedoraId = isVendedora
    ? user.id
    : (vendedoras[0]?.id ?? user.id)

  const categorias = (categoriasRes.data ?? []).map(c => ({
    id: c.id as string,
    nome: c.nome as string,
  }))

  // Stats
  const total = registros.length
  const aguardando = registros.filter(r => r.status === 'aguardando').length
  const valorPotencial = registros.reduce((acc, r) => acc + (r.valor_potencial ?? 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Lista de Espera</h1>
        <p className="text-sm text-muted-foreground">{lojaNome} · Demanda real para comprar melhor</p>
      </div>

      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{aguardando}</p>
            <p className="text-xs text-muted-foreground">Aguardando</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {valorPotencial > 0 ? fmt(valorPotencial) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">Potencial</p>
          </div>
        </div>
      )}

      <ListaEsperaForm
        loja_id={loja_id}
        isVendedora={isVendedora}
        defaultVendedoraId={defaultVendedoraId}
        vendedoras={vendedoras}
        categorias={categorias}
      />

      <ListaEsperaCards registros={registros} />
    </div>
  )
}
