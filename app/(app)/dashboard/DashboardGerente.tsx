import Link from 'next/link'
import {
  ShoppingBag, RefreshCcw, DollarSign, AlertCircle,
  Send, ChevronRight, Package, Bell, Users,
} from 'lucide-react'
import { ComissaoChart } from './ComissaoChart'
import type { FunilStep, ProdutoRadarItem, VendedoraRanking, VendedoraComPendencia } from './page'

interface Props {
  loja: { id: string; nome: string }
  totalVendasValor: number
  qtdVendas: number
  totalRecomprasValor: number
  qtdRecompras: number
  totalComissoes: number
  qtdAvisosAtrasados: number
  qtdAvisosHoje: number
  avisosEnviadosCount: number
  vendedorasComPendencias: VendedoraComPendencia[]
  funil: FunilStep[]
  produtosRadar: ProdutoRadarItem[]
  rankingVendedoras: VendedoraRanking[]
  diasMes: string[]
  comissaoDiaria: number[]
  metaComissao: number | null
  hojeDia: number
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const MEDALS = ['🥇', '🥈', '🥉']
const AVATAR_BG = ['bg-amber-500', 'bg-slate-400', 'bg-orange-400', 'bg-blue-400', 'bg-violet-400']

export function DashboardGerente({
  loja,
  totalVendasValor,
  qtdVendas,
  totalRecomprasValor,
  qtdRecompras,
  totalComissoes,
  qtdAvisosAtrasados,
  qtdAvisosHoje,
  avisosEnviadosCount,
  vendedorasComPendencias,
  funil,
  produtosRadar,
  rankingVendedoras,
  diasMes,
  comissaoDiaria,
  metaComissao,
  hojeDia,
}: Props) {
  const produtoMax = produtosRadar[0]?.total ?? 1
  const funilMax = funil[0]?.value ?? 1
  const totalPendencias = vendedorasComPendencias.reduce((s, v) => s + v.atrasados + v.hoje, 0)

  let headlineTitulo: string
  let headlineSubtitulo: string
  let headlineCor: string
  let headlineIcon: React.ReactNode
  let headlineEyebrow: string

  if (qtdAvisosAtrasados > 0) {
    headlineTitulo = `${qtdAvisosAtrasados} aviso${qtdAvisosAtrasados !== 1 ? 's' : ''} atrasado${qtdAvisosAtrasados !== 1 ? 's' : ''}`
    headlineSubtitulo = 'Oriente a equipe a enviar agora para manter o timing com os clientes.'
    headlineCor = 'from-red-500 to-red-700'
    headlineIcon = <AlertCircle className="h-5 w-5 text-white" />
    headlineEyebrow = 'Ação necessária'
  } else if (qtdAvisosHoje > 0) {
    headlineTitulo = `${qtdAvisosHoje} aviso${qtdAvisosHoje !== 1 ? 's' : ''} para hoje`
    headlineSubtitulo = 'A equipe está em dia. Confira a fila e acompanhe os envios.'
    headlineCor = 'from-amber-500 to-orange-600'
    headlineIcon = <Bell className="h-5 w-5 text-white" />
    headlineEyebrow = 'Fila de hoje'
  } else if (totalRecomprasValor > 0) {
    headlineTitulo = `${fmt(totalRecomprasValor)} em recompras`
    headlineSubtitulo = `${qtdRecompras} cliente${qtdRecompras !== 1 ? 's' : ''} voltou${qtdRecompras !== 1 ? 'aram' : ''} nos últimos 30 dias.`
    headlineCor = 'from-emerald-500 to-green-700'
    headlineIcon = <RefreshCcw className="h-5 w-5 text-white" />
    headlineEyebrow = 'Resultado · 30 dias'
  } else {
    headlineTitulo = 'Tudo em dia'
    headlineSubtitulo = 'Nenhum aviso pendente. Registre novas vendas para manter o fluxo.'
    headlineCor = 'from-slate-500 to-slate-700'
    headlineIcon = <ShoppingBag className="h-5 w-5 text-white" />
    headlineEyebrow = 'Monitoramento'
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{loja.nome} · últimos 30 dias</p>
      </div>

      {/* Headline — premium card */}
      <Link href="/avisos" className="block">
        <div className={`rounded-2xl bg-gradient-to-br ${headlineCor} text-white p-4 md:p-5 shadow-md`}>
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/15 flex items-center justify-center flex-none">
              {headlineIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/60 font-semibold uppercase tracking-widest leading-none">{headlineEyebrow}</p>
              <p className="font-bold text-xl md:text-2xl leading-tight mt-0.5">{headlineTitulo}</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-none text-white/50" />
          </div>
          <p className="text-sm text-white/75 mt-3 ml-[50px] md:ml-[54px] leading-relaxed">{headlineSubtitulo}</p>
        </div>
      </Link>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
        <MetricCard label="Total vendido" value={fmt(totalVendasValor)} sub={`${qtdVendas} vendas`}
          icon={<ShoppingBag className="h-5 w-5 text-white" />} iconBg="bg-amber-500" />
        <MetricCard label="Recompras" value={fmt(totalRecomprasValor)} sub={`${qtdRecompras} clientes`}
          icon={<RefreshCcw className="h-5 w-5 text-white" />} iconBg="bg-green-500" />
        <MetricCard label="Comissões" value={fmt(totalComissoes)} sub="30 dias"
          icon={<DollarSign className="h-5 w-5 text-white" />} iconBg="bg-emerald-600" />
        <MetricCard label="Atrasados" value={String(qtdAvisosAtrasados)}
          sub={qtdAvisosAtrasados > 0 ? 'atenção necessária' : 'em dia ✓'}
          icon={<AlertCircle className="h-5 w-5 text-white" />}
          iconBg={qtdAvisosAtrasados > 0 ? 'bg-red-500' : 'bg-slate-400'}
          urgente={qtdAvisosAtrasados > 0} href="/avisos" />
        <MetricCard label="Para hoje" value={String(qtdAvisosHoje)} sub="a enviar hoje"
          icon={<Bell className="h-5 w-5 text-white" />} iconBg="bg-blue-500" href="/avisos" />
        <MetricCard label="Enviados" value={String(avisosEnviadosCount)} sub="30 dias"
          icon={<Send className="h-5 w-5 text-white" />} iconBg="bg-indigo-500" />
      </div>

      {/* Chart + Pendências da equipe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* Gráfico comissão acumulada do mês */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Comissão acumulada do mês</h2>
                {metaComissao && (
                  <p className="text-xs text-muted-foreground mt-0.5">Meta: {fmt(metaComissao)}</p>
                )}
                {!metaComissao && (
                  <p className="text-xs text-muted-foreground mt-0.5">Meta ainda não configurada</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{diasMes[0]?.slice(0, 7).replace('-', '/')}</span>
            </div>
            <ComissaoChart diasMes={diasMes} comissaoDiaria={comissaoDiaria} metaValor={metaComissao} hojeDia={hojeDia} />
            <div className="grid grid-cols-3 mt-4 pt-4 border-t gap-2 text-center">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Comissões do mês</p>
                <p className="text-sm font-bold tabular-nums mt-0.5 text-emerald-600">{fmt(totalComissoes)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recompras</p>
                <p className="text-sm font-bold tabular-nums mt-0.5">{fmt(totalRecomprasValor)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total vendido</p>
                <p className="text-sm font-bold tabular-nums mt-0.5">{fmt(totalVendasValor)}</p>
              </div>
            </div>
          </div>

          {/* Funil */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4">Funil de recompra</h2>
            <div className="space-y-2 overflow-hidden">
              {funil.map((step, i) => {
                const pct = funilMax > 0 ? (step.value / funilMax) * 100 : 0
                const widthPct = i === 0 ? 100 : Math.min(100, Math.max(pct, 28))
                const convPct = i > 0 && funil[0].value > 0
                  ? Math.round((step.value / funil[0].value) * 100) : null
                return (
                  <div key={i} className="transition-all duration-700" style={{ width: `${widthPct}%` }}>
                    <div className={`${step.cor} rounded-xl px-4 py-3 flex items-center justify-between gap-3`}>
                      <span className="text-xs font-semibold text-white/90 truncate">{step.label}</span>
                      <div className="flex items-center gap-2 flex-none">
                        {convPct !== null && convPct <= 100 && (
                          <span className="text-xs text-white/60 hidden sm:inline">{convPct}%</span>
                        )}
                        <span className="text-lg font-bold text-white tabular-nums">{step.value}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground/60 mt-3">
              Uma venda pode gerar mais de uma mensagem programada.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {/* Pendências por vendedora */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Pendências da equipe</h2>
              <Link href="/avisos" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Ver fila <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {vendedorasComPendencias.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-lg">✓</span>
                </div>
                <p className="text-sm font-medium text-green-700">Equipe em dia</p>
                <p className="text-xs text-muted-foreground mt-1">Nenhum aviso pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vendedorasComPendencias.map((v, i) => {
                  const initials = v.nome.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${AVATAR_BG[i % AVATAR_BG.length]} flex items-center justify-center text-xs font-bold text-white flex-none`}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {v.atrasados > 0 && (
                            <span className="text-xs text-red-600 font-medium">{v.atrasados} atrasado{v.atrasados !== 1 ? 's' : ''}</span>
                          )}
                          {v.hoje > 0 && (
                            <span className="text-xs text-amber-600 font-medium">{v.hoje} hoje</span>
                          )}
                        </div>
                      </div>
                      <Link href="/avisos" className="text-xs text-primary hover:underline flex-none">
                        Ir →
                      </Link>
                    </div>
                  )
                })}
                {totalPendencias > 0 && (
                  <Link
                    href="/avisos"
                    className="w-full mt-2 rounded-lg border border-dashed border-primary/30 py-2.5 text-center text-sm font-medium text-primary hover:bg-primary/5 transition-colors block"
                  >
                    Ir para avisos →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Ranking */}
          {rankingVendedoras.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Ranking da equipe</h2>
              <div className="divide-y">
                {rankingVendedoras.map((v, i) => {
                  const initials = v.nome.split(' ').filter(Boolean).map(n => n[0].toUpperCase()).slice(0, 2).join('')
                  const leaderTotal = rankingVendedoras[0]?.total ?? 1
                  return (
                    <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="relative flex-none">
                        <div className={`w-9 h-9 rounded-full ${AVATAR_BG[i] ?? 'bg-slate-400'} flex items-center justify-center text-xs font-bold text-white`}>
                          {initials}
                        </div>
                        {i < 3 && <span className="absolute -top-1.5 -right-1.5 text-sm leading-none select-none" aria-hidden="true">{MEDALS[i]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{v.nome}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${i === 0 ? 'bg-amber-500' : 'bg-slate-300'}`}
                              style={{ width: `${Math.round((v.total / leaderTotal) * 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground flex-none">{v.qtd}v</span>
                        </div>
                      </div>
                      <p className="font-bold text-sm tabular-nums flex-none">{fmt(v.total)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Radar de produtos */}
      {produtosRadar.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Radar de produtos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {produtosRadar.map((p, i) => (
              <div key={i} className={`rounded-xl border bg-background p-4 flex flex-col gap-2.5 ${i === 0 ? 'ring-2 ring-amber-400/60 border-amber-200' : ''}`}>
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-none">
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold leading-tight line-clamp-2 min-h-[2.5rem]">{p.nome}</p>
                <p className="text-sm font-bold tabular-nums">{fmt(p.total)}</p>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.max((p.total / produtoMax) * 100, 4)}%` }} />
                </div>
                {p.avisos_pendentes > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Bell className="h-3 w-3 flex-none" />
                    <span>{p.avisos_pendentes} aviso{p.avisos_pendentes !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTAs operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/avisos" className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-none">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Ir para avisos</p>
            <p className="text-xs text-muted-foreground">Fila da equipe</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-none" />
        </Link>
        <Link href="/vendas" className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-none">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium">Ver extrato</p>
            <p className="text-xs text-muted-foreground">Todas as vendas</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-none" />
        </Link>
      </div>
    </div>
  )
}

function MetricCard({
  label, value, sub, icon, iconBg, urgente, href,
}: {
  label: string; value: string; sub: string; icon: React.ReactNode
  iconBg: string; urgente?: boolean; href?: string
}) {
  const content = (
    <div className={`rounded-2xl border bg-card p-4 md:p-5 flex flex-col gap-3 h-full transition-shadow hover:shadow-md ${urgente ? 'border-red-200 bg-red-50/60' : ''}`}>
      <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${iconBg} flex items-center justify-center flex-none shadow-sm`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-xl md:text-2xl font-bold tabular-nums mt-0.5 ${urgente ? 'text-red-700' : ''}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block">{content}</Link>
  return content
}
