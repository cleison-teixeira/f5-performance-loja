export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { Package } from 'lucide-react'
import { getAppContext } from '@/lib/app/contexto'
import { measureAsync } from '@/lib/performance/timing'
import { ListaEsperaForm } from './ListaEsperaForm'
import { ListaEsperaPageClient } from './ListaEsperaPageClient'
import { ListaEsperaCards, type RegistroListaEspera } from './ListaEsperaCards'
import { normalizarNomePessoa, normalizarNomeProduto } from '@/lib/utils/normalizacao-texto'
import { isContaEstrutural } from '@/lib/acessos/filtrar-membros'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default async function ListaEsperaPage() {
  const appCtx = await getAppContext()
  if (!appCtx) redirect('/login')

  const { user, role: userRole, ctx } = appCtx

  if (!appCtx.hasMembros || ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Pedidos em Espera</h1>
        <p className="text-sm text-muted-foreground">Voce ainda nao pertence a nenhuma loja.</p>
      </div>
    )
  }

  const admin = createAdminClient()

  const isVendedora = userRole === 'vendedora'
  const mostrarLoja = ctx.escopo === 'rede'
  const lojaNomeMap = new Map(ctx.lojas.map(l => [l.id, l.nome]))
  const qtdLojas = ctx.lojas.length
  const subtitulo = ctx.escopo === 'rede'
    ? `Toda a rede · ${qtdLojas} ${qtdLojas === 1 ? 'loja conectada' : 'lojas conectadas'} · Demanda real para comprar melhor`
    : `${ctx.lojaNome} · Demanda real para comprar melhor`

  const loja_id = ctx.lojaId ?? ctx.lojaIds[0]
  const lojaNome = ctx.lojaNome ?? ''

  // Empresa e rede multi-loja
  let empresaId = ''
  let temRedeMultiLoja = false
  if (ctx.escopo === 'loja') {
    const { data: lojaData } = await admin.from('lojas').select('empresa_id').eq('id', loja_id).single()
    if (lojaData) {
      empresaId = (lojaData as { empresa_id: string }).empresa_id
      const { data: outrasLojas } = await admin
        .from('lojas')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('ativa', true)
        .eq('admin_only', false)
        .neq('id', loja_id)
      temRedeMultiLoja = (outrasLojas?.length ?? 0) > 0
    }
  }

  const [registrosRes, categoriasRes, vendedorasRes, produtosRes, lojaEmailRes] = await measureAsync('lista-espera:queries', () => Promise.all([
    admin
      .from('lista_espera')
      .select('id, cliente_id, cliente_nome, cliente_whatsapp, produto_nome, produto_id, categoria_id, categoria_nome, valor_potencial, quantidade, status, observacao, criado_em, data_registro, vendedora_id, loja_id, grupo_pedido_id, recorrente, ciclo_recompra_dias, qtd_mensagens, clientes(nao_contatar)')
      .in('loja_id', ctx.lojaIds)
      .order('criado_em', { ascending: false }),
    ctx.escopo === 'loja'
      ? admin
          .from('categorias')
          .select('id, nome')
          .eq('loja_id', loja_id)
          .eq('ativa', true)
          .order('nome')
      : Promise.resolve({ data: [] as Array<{ id: unknown; nome: unknown }> }),
    ctx.escopo === 'loja' && !isVendedora
      ? admin
          .from('membros_loja')
          .select('perfil_id, role, perfis(id, nome)')
          .eq('loja_id', loja_id)
          .in('role', ['dono', 'gerente', 'lider', 'vendedora'])
          .eq('ativo', true)
      : Promise.resolve({ data: [] as Array<{ perfil_id: unknown; role: unknown; perfis: unknown }> }),
    ctx.escopo === 'loja'
      ? admin
          .from('produtos')
          .select('id, nome')
          .eq('loja_id', loja_id)
          .eq('ativo', true)
          .order('nome')
      : Promise.resolve({ data: [] as Array<{ id: unknown; nome: unknown }> }),
    ctx.escopo === 'loja' && !isVendedora
      ? admin
          .from('liberacoes_acesso')
          .select('email')
          .eq('loja_id', loja_id)
          .eq('tipo', 'loja')
          .order('criado_em', { ascending: true })
      : Promise.resolve({ data: [] as Array<{ email: string }> }),
  ]))

  const categoriaMap: Record<string, string> = {}
  for (const c of categoriasRes.data ?? []) {
    categoriaMap[c.id as string] = c.nome as string
  }

  const nomeMap: Record<string, string> = {}

  for (const m of vendedorasRes.data ?? []) {
    const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }> | null
    const perfil = Array.isArray(p) ? p[0] : p
    if (perfil?.nome) nomeMap[m.perfil_id as string] = perfil.nome
  }

  const allVendedoraIds = [...new Set((registrosRes.data ?? []).map(r => r.vendedora_id as string).filter(Boolean))]
  const missingIds = allVendedoraIds.filter(id => !nomeMap[id])
  if (missingIds.length > 0) {
    const { data: perfisData } = await admin
      .from('perfis')
      .select('id, nome')
      .in('id', missingIds)
    for (const p of perfisData ?? []) nomeMap[p.id as string] = p.nome as string
  }

  // Demandas ativas por item (para badge "Em busca na rede")
  const listaEsperaIds = (registrosRes.data ?? []).map(r => r.id as string)
  const demandasAtivasMap = new Map<string, { id: string; status: string }>()
  if (temRedeMultiLoja && listaEsperaIds.length > 0) {
    const { data: demandasAtivas } = await admin
      .from('demandas_rede')
      .select('id, lista_espera_id, status')
      .eq('loja_origem_id', loja_id)
      .in('status', ['em_busca', 'encontrado', 'separado'])
      .in('lista_espera_id', listaEsperaIds)
    for (const d of demandasAtivas ?? []) {
      const leId = (d as { lista_espera_id: string | null }).lista_espera_id
      if (leId) demandasAtivasMap.set(leId, { id: d.id as string, status: d.status as string })
    }
  }

  // Nome do usuário para aparecer nas respostas de demanda
  const { data: perfilData } = await admin.from('perfis').select('nome').eq('id', user.id).maybeSingle()
  const userNome = (perfilData as { nome: string } | null)?.nome ?? user.email ?? ''

  const registros: RegistroListaEspera[] = (registrosRes.data ?? []).map(r => {
    const clienteData = (r as unknown as { clientes: { nao_contatar: boolean } | null }).clientes
    return ({
    id: r.id as string,
    loja_id: r.loja_id as string,
    cliente_nome: normalizarNomePessoa(r.cliente_nome as string),
    cliente_whatsapp: r.cliente_whatsapp as string,
    produto_nome: normalizarNomeProduto(r.produto_nome as string),
    produto_id: r.produto_id as string | null,
    categoria_nome:
      (r.categoria_id ? categoriaMap[r.categoria_id as string] : null) ??
      (r.categoria_nome as string | null),
    valor_potencial: r.valor_potencial as number | null,
    quantidade: (r.quantidade as number) ?? 1,
    status: r.status as string,
    observacao: r.observacao as string | null,
    criado_em: r.criado_em as string,
    data_registro: (r as unknown as { data_registro: string | null }).data_registro ?? null,
    vendedora_id: r.vendedora_id as string | null,
    grupo_pedido_id: (r as unknown as { grupo_pedido_id: string | null }).grupo_pedido_id ?? null,
    recorrente: (r as unknown as { recorrente: boolean | null }).recorrente ?? true,
    ciclo_recompra_dias: (r as unknown as { ciclo_recompra_dias: number | null }).ciclo_recompra_dias ?? 30,
    qtd_mensagens: (r as unknown as { qtd_mensagens: number | null }).qtd_mensagens ?? 5,
    vendedora_nome: nomeMap[r.vendedora_id as string] ?? '—',
    loja_nome: mostrarLoja ? (lojaNomeMap.get(r.loja_id as string) ?? '') : undefined,
    nao_contatar: clienteData?.nao_contatar ?? false,
    demanda_ativa: demandasAtivasMap.get(r.id as string) ?? null,
  })})

  // Buscar auth email dos donos para Critério 2 (email perfil === email loja)
  const donoIdsLE = [...new Set(
    (vendedorasRes.data ?? [])
      .filter(m => (m as unknown as { role: string }).role === 'dono')
      .map(m => m.perfil_id as string)
  )]
  const donoAuthEmailsLE: Record<string, string> = {}
  if (donoIdsLE.length > 0 && !isVendedora && ctx.escopo !== 'rede') {
    await Promise.all(donoIdsLE.map(async pid => {
      const { data } = await admin.auth.admin.getUserById(pid)
      if (data?.user?.email) donoAuthEmailsLE[pid] = data.user.email
    }))
  }

  const lojaLibEmails = ((lojaEmailRes as { data: Array<{ email: string }> | null }).data ?? []).map(r => r.email as string).filter(Boolean)
  const lojaEmail = lojaLibEmails[0] ?? null
  const vendedoras = isVendedora || ctx.escopo === 'rede'
    ? []
    : (vendedorasRes.data ?? []).flatMap(m => {
        const p = m.perfis as unknown as { id: string; nome: string } | Array<{ id: string; nome: string }>
        const perfil = Array.isArray(p) ? p[0] : p
        const nome = perfil?.nome ?? '—'
        const role = (m as unknown as { role: string }).role
        const perfilEmail = donoAuthEmailsLE[m.perfil_id as string] ?? null
        if (isContaEstrutural({ role, perfilNome: nome, perfilEmail, lojaNome, lojaEmail, lojaLibEmails })) return []
        return [{ id: m.perfil_id as string, nome }]
      })

  const defaultVendedoraId = isVendedora
    ? user.id
    : (vendedoras[0]?.id ?? user.id)

  const categorias = ctx.escopo === 'loja'
    ? (categoriasRes.data ?? []).map(c => ({ id: c.id as string, nome: c.nome as string }))
    : []

  const produtos = ctx.escopo === 'loja'
    ? (produtosRes.data ?? []).map(p => ({ id: p.id as string, nome: p.nome as string }))
    : []

  const total = registros.length
  const qtdAguardando = registros.filter(r => r.status === 'aguardando').length
  const qtdAvisados = registros.filter(r => r.status === 'avisado').length
  const potencialEmAberto = registros
    .filter(r => r.status === 'aguardando' || r.status === 'encontrado_outra_loja' || r.status === 'avisado')
    .reduce((acc, r) => acc + (r.valor_potencial ?? 0), 0)
  const convertidoValor = registros
    .filter(r => r.status === 'convertido')
    .reduce((acc, r) => acc + (r.valor_potencial ?? 0), 0)
  const qtdClientes = new Set(
    registros.filter(r => r.status === 'aguardando').map(r => r.cliente_nome)
  ).size

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pedidos em Espera</h1>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </div>

      {/* ── 4 cards de métricas ── */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{qtdAguardando}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Aguardando</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 leading-tight">
              {potencialEmAberto > 0 ? fmt(potencialEmAberto) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Potencial em aberto</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-purple-600 dark:text-purple-400">{qtdAvisados}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Clientes avisados</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300 leading-tight">
              {convertidoValor > 0 ? fmt(convertidoValor) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Convertido em venda</p>
          </div>
        </div>
      )}

      {/* ── Banner de oportunidade ── */}
      {qtdAguardando > 0 && potencialEmAberto > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center flex-none shadow-sm mt-0.5">
            <Package className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Oportunidade</p>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-0.5">
              {fmt(potencialEmAberto)} em potencial aguardando reposição
            </p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
              {qtdAguardando} item{qtdAguardando !== 1 ? 's' : ''} aguardando · {qtdClientes} cliente{qtdClientes !== 1 ? 's' : ''} interessado{qtdClientes !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* ── Formulario ── */}
      {ctx.escopo === 'loja' ? (
        <ListaEsperaForm
          loja_id={loja_id}
          isVendedora={isVendedora}
          defaultVendedoraId={defaultVendedoraId}
          vendedoras={vendedoras}
          categorias={categorias}
          produtos={produtos}
        />
      ) : (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-2 leading-relaxed">
          Selecione uma loja no seletor <strong>Visão</strong> acima para adicionar itens à lista de espera.
        </p>
      )}

      <ListaEsperaPageClient
        initialRegistros={registros}
        defaultLojaNome={lojaNome}
        vendedoras={vendedoras}
        produtos={produtos}
        podeEditar={ctx.escopo === 'loja'}
        temRedeMultiLoja={temRedeMultiLoja}
        lojaId={loja_id}
        lojaNome={lojaNome}
        empresaId={empresaId}
        userId={user.id}
        userNome={userNome}
      />
    </div>
  )
}
