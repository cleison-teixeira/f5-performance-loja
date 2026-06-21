import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function mesAtual(): { inicioMes: string; inicioProxMes: string; mesLabel: string } {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = agora.getMonth() + 1
  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const proxAno = mes === 12 ? ano + 1 : ano
  const proxMes = mes === 12 ? 1 : mes + 1
  const inicioProxMes = `${proxAno}-${String(proxMes).padStart(2, '0')}-01`
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { inicioMes, inicioProxMes, mesLabel }
}

function ProgressBar({ pct, bateu }: { pct: number; bateu: boolean }) {
  return (
    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          bateu ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function PctBadge({ pct, bateu }: { pct: number; bateu: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
      bateu
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : pct >= 70
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-muted text-muted-foreground'
    }`}>
      {pct}%
    </span>
  )
}

export default async function MetasPage() {
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
        <h1 className="text-xl font-semibold">Metas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const loja_id = membro.loja_id as string
  const role = membro.role as string
  const isVendedora = role === 'vendedora'
  const lojaRaw = membro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const { inicioMes, inicioProxMes, mesLabel } = mesAtual()

  // ── Vendedora ──────────────────────────────────────────────────────────────
  if (isVendedora) {
    const [metaRes, vendasRes] = await Promise.all([
      // RLS policy "vendedora_le_meta_propria" garante retorno apenas da própria meta
      supabase
        .from('metas_vendedora')
        .select('valor_meta, comissao_base, comissao_meta')
        .eq('loja_id', loja_id)
        .eq('vendedora_id', user.id)
        .eq('mes', inicioMes)
        .maybeSingle(),
      supabase
        .from('vendas')
        .select('valor, comissao_venda(valor_comissao)')
        .eq('loja_id', loja_id)
        .eq('vendedora_id', user.id)
        .gte('data_compra', inicioMes)
        .lt('data_compra', inicioProxMes),
    ])

    const meta = metaRes.data
    const valorMeta = (meta?.valor_meta as number) ?? 0
    const comissaoBase = (meta?.comissao_base as number) ?? 0
    const comissaoMetaPerc = (meta?.comissao_meta as number) ?? 0

    let vendido = 0
    let comissaoAcumulada = 0
    for (const v of vendasRes.data ?? []) {
      vendido += (v.valor as number) ?? 0
      const cvRaw = v.comissao_venda as unknown as
        | Array<{ valor_comissao: number }> | { valor_comissao: number } | null
      const cv = Array.isArray(cvRaw) ? cvRaw[0] : cvRaw
      comissaoAcumulada += cv?.valor_comissao ?? 0
    }

    const faltante = Math.max(0, valorMeta - vendido)
    const pct = valorMeta > 0 ? Math.min(100, Math.round((vendido / valorMeta) * 100)) : 0
    const bateu = valorMeta > 0 && vendido >= valorMeta

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Minha meta</h1>
          <p className="text-sm text-muted-foreground">{mesLabel} · {lojaNome}</p>
        </div>

        {!meta ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-1">
            <p className="text-sm font-medium">Nenhuma meta definida para este mês</p>
            <p className="text-xs text-muted-foreground">Fale com o responsável pela loja para configurar sua meta.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Card principal de progresso */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Meta do mês</p>
                  <p className="text-3xl font-bold tabular-nums mt-0.5">{fmt(valorMeta)}</p>
                </div>
                <PctBadge pct={pct} bateu={bateu} />
              </div>

              <div className="space-y-1.5">
                <ProgressBar pct={pct} bateu={bateu} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmt(vendido)} vendido</span>
                  <span>{fmt(valorMeta)} meta</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Vendido no mês</p>
                  <p className="text-lg font-bold tabular-nums">{fmt(vendido)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">{bateu ? 'Meta batida!' : 'Falta para meta'}</p>
                  <p className={`text-lg font-bold tabular-nums ${bateu ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {bateu ? '🎯 Meta!' : fmt(faltante)}
                  </p>
                </div>
              </div>
            </div>

            {/* Card de comissão */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Comissão</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Acumulada</p>
                  <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(comissaoAcumulada)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% Base</p>
                  <p className="text-base font-bold tabular-nums">{comissaoBase}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">% Na meta</p>
                  <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{comissaoMetaPerc}%</p>
                </div>
              </div>
            </div>

            {/* Mensagem motivacional */}
            {!bateu && faltante > 0 && (
              <p className="text-sm text-muted-foreground text-center px-2 leading-relaxed">
                Você está a{' '}
                <span className="font-semibold text-foreground">{fmt(faltante)}</span>{' '}
                da sua meta. Continue acompanhando seus avisos e vendas do dia.
              </p>
            )}
            {bateu && (
              <p className="text-sm text-center text-emerald-600 dark:text-emerald-400 font-medium px-2">
                Meta do mês batida! Parabéns — continue assim.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Dono / Gerente ─────────────────────────────────────────────────────────
  const admin = createAdminClient()

  const [metasRes, vendasRes, membrosRes] = await Promise.all([
    admin
      .from('metas_vendedora')
      .select('vendedora_id, valor_meta, comissao_base, comissao_meta')
      .eq('loja_id', loja_id)
      .eq('mes', inicioMes),
    admin
      .from('vendas')
      .select('vendedora_id, valor')
      .eq('loja_id', loja_id)
      .gte('data_compra', inicioMes)
      .lt('data_compra', inicioProxMes),
    admin
      .from('membros_loja')
      .select('perfil_id, perfis(nome)')
      .eq('loja_id', loja_id)
      .eq('role', 'vendedora')
      .eq('ativo', true),
  ])

  // Agrega vendido por vendedora
  const vendidoPorVendedora: Record<string, number> = {}
  for (const v of vendasRes.data ?? []) {
    const vid = v.vendedora_id as string
    vendidoPorVendedora[vid] = (vendidoPorVendedora[vid] ?? 0) + ((v.valor as number) ?? 0)
  }

  // Mapa de nomes
  const nomeMap: Record<string, string> = {}
  for (const m of membrosRes.data ?? []) {
    const p = m.perfis as unknown as { nome: string } | Array<{ nome: string }>
    const perfil = Array.isArray(p) ? p[0] : p
    nomeMap[m.perfil_id as string] = perfil?.nome ?? '—'
  }

  const rows = (metasRes.data ?? [])
    .map(m => {
      const vendido = vendidoPorVendedora[m.vendedora_id as string] ?? 0
      const valorMeta = m.valor_meta as number
      const faltante = Math.max(0, valorMeta - vendido)
      const pct = valorMeta > 0 ? Math.min(100, Math.round((vendido / valorMeta) * 100)) : 0
      return {
        vendedora_id: m.vendedora_id as string,
        nome: nomeMap[m.vendedora_id as string] ?? '—',
        valor_meta: valorMeta,
        vendido,
        faltante,
        pct,
        bateu: valorMeta > 0 && vendido >= valorMeta,
      }
    })
    .sort((a, b) => b.pct - a.pct)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Metas da equipe</h1>
          <p className="text-sm text-muted-foreground">{mesLabel} · {lojaNome}</p>
        </div>
        <Link href="/configuracoes/comissoes" className="text-sm text-primary hover:underline shrink-0">
          Configurar →
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-center space-y-1">
          <p className="text-sm font-medium">Nenhuma meta configurada para este mês</p>
          <p className="text-xs text-muted-foreground">
            Acesse{' '}
            <Link href="/configuracoes/comissoes" className="text-primary hover:underline">
              Configurações → Comissões da equipe
            </Link>{' '}
            para definir metas.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => (
            <div key={row.vendedora_id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 text-muted-foreground">
                    {row.nome.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold truncate">{row.nome}</p>
                </div>
                <PctBadge pct={row.pct} bateu={row.bateu} />
              </div>

              <ProgressBar pct={row.pct} bateu={row.bateu} />

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Vendido</p>
                  <p className="font-semibold tabular-nums">{fmt(row.vendido)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Meta</p>
                  <p className="font-semibold tabular-nums">{fmt(row.valor_meta)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{row.bateu ? 'Bateu!' : 'Faltante'}</p>
                  <p className={`font-semibold tabular-nums ${row.bateu ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {row.bateu ? '🎯' : fmt(row.faltante)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
