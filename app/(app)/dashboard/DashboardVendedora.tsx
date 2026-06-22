import Link from 'next/link'
import {
  Bell, AlertCircle, RefreshCcw, DollarSign,
  TrendingUp, ChevronRight, Clock, Target,
} from 'lucide-react'
import { ComissaoChart } from './ComissaoChart'
import type { DashboardAviso } from './page'

interface Props {
  nomeVendedora: string
  totalVendasValor: number
  qtdVendas: number
  totalRecomprasValor: number
  qtdRecompras: number
  totalComissoes: number
  previsaoEmAberto: number
  avisosAtrasados: DashboardAviso[]
  avisosHoje: DashboardAviso[]
  diasMes: string[]
  comissaoDiaria: number[]
  metaComissao: number | null
  hojeDia: number
  totalVendasMes: number
  metaVendasMes: number | null
  diasRestantes: number
}

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const TIPO_LABEL: Record<string, string> = {
  agradecimento: 'Agradecimento',
  relacionamento: 'Relacionamento',
  recompra: 'Recompra',
  oferta: 'Oferta',
}

const TIPO_COR: Record<string, string> = {
  agradecimento: 'bg-blue-100 text-blue-700',
  relacionamento: 'bg-amber-100 text-amber-700',
  recompra: 'bg-green-100 text-green-700',
  oferta: 'bg-purple-100 text-purple-700',
}

export function DashboardVendedora({
  nomeVendedora,
  totalVendasValor,
  qtdVendas,
  totalRecomprasValor,
  qtdRecompras,
  totalComissoes,
  previsaoEmAberto,
  avisosAtrasados,
  avisosHoje,
  diasMes,
  comissaoDiaria,
  metaComissao,
  hojeDia,
  totalVendasMes,
  metaVendasMes,
  diasRestantes,
}: Props) {
  const totalAtrasados = avisosAtrasados.length
  const totalHoje = avisosHoje.length
  const firstName = nomeVendedora.split(' ')[0]

  let headlineTitulo: string
  let headlineSubtitulo: string
  let headlineCor: string
  let headlineIcon: React.ReactNode
  let headlineEyebrow: string
  let headlineHref = '/avisos'

  if (totalAtrasados > 0) {
    headlineTitulo = `${totalAtrasados} aviso${totalAtrasados !== 1 ? 's' : ''} atrasado${totalAtrasados !== 1 ? 's' : ''}`
    headlineSubtitulo = 'Envie agora — cada dia de atraso reduz a chance de recompra.'
    headlineCor = 'from-red-500 to-red-700'
    headlineIcon = <AlertCircle className="h-5 w-5 text-white" />
    headlineEyebrow = 'Ação necessária'
  } else if (totalHoje > 0) {
    headlineTitulo = `${totalHoje} aviso${totalHoje !== 1 ? 's' : ''} para hoje`
    headlineSubtitulo = `Boa sorte, ${firstName}! Sua fila de hoje está pronta.`
    headlineCor = 'from-amber-500 to-orange-600'
    headlineIcon = <Bell className="h-5 w-5 text-white" />
    headlineEyebrow = 'Fila de hoje'
  } else if (totalRecomprasValor > 0) {
    headlineTitulo = `${fmt(totalRecomprasValor)} em recompras`
    headlineSubtitulo = `Parabéns, ${firstName}! ${qtdRecompras} cliente${qtdRecompras !== 1 ? 's' : ''} voltou${qtdRecompras !== 1 ? 'aram' : ''} nos últimos 30 dias.`
    headlineCor = 'from-emerald-500 to-green-700'
    headlineIcon = <RefreshCcw className="h-5 w-5 text-white" />
    headlineEyebrow = 'Resultado · 30 dias'
    headlineHref = '/comissoes'
  } else {
    headlineTitulo = `Olá, ${firstName}!`
    headlineSubtitulo = 'Sua fila está vazia. Registre uma venda para começar.'
    headlineCor = 'from-amber-400 to-orange-500'
    headlineIcon = <TrendingUp className="h-5 w-5 text-white" />
    headlineEyebrow = 'Bem-vinda'
    headlineHref = '/vendas/nova'
  }

  const metaPct = metaVendasMes && metaVendasMes > 0
    ? Math.min(100, Math.round((totalVendasMes / metaVendasMes) * 100))
    : null
  const faltaMeta = metaVendasMes && totalVendasMes < metaVendasMes ? metaVendasMes - totalVendasMes : 0
  const metaAtingida = metaVendasMes != null && totalVendasMes >= metaVendasMes

  // Resultado strip appears when urgency headline hides the positive result
  const showResultadoStrip = (totalAtrasados > 0 || totalHoje > 0) && totalRecomprasValor > 0

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meu painel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{nomeVendedora} · suas metas, avisos e recompras</p>
      </div>

      {/* Comissão — destaque principal */}
      <Link href="/comissoes" className="block">
        <div className="rounded-2xl border bg-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center flex-none shadow-sm">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest">Minha comissão do mês</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-600 leading-tight mt-0.5">{fmt(totalComissoes)}</p>
            {previsaoEmAberto > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">+ {fmt(previsaoEmAberto)} potencial em aberto</p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-none" />
        </div>
      </Link>

      {/* Meta do mês */}
      {metaVendasMes != null && metaVendasMes > 0 && metaPct !== null && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Meta do mês</h2>
            </div>
            <span className="text-xs text-muted-foreground">{diasRestantes}d restantes</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold tabular-nums">{fmt(totalVendasMes)}</span>
            <span className="text-sm text-muted-foreground">de {fmt(metaVendasMes)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metaAtingida ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${metaPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-medium text-muted-foreground">{metaPct}% da meta</span>
            <span className={`text-xs font-semibold ${metaAtingida ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {metaAtingida ? '✓ Meta atingida!' : `Falta ${fmt(faltaMeta)}`}
            </span>
          </div>
        </div>
      )}

      {/* Headline de ação */}
      <Link href={headlineHref} className="block">
        <div className={`rounded-2xl bg-gradient-to-br ${headlineCor} text-white p-4 md:p-5 shadow-md`}>
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-none">
              {headlineIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white/60 font-semibold uppercase tracking-widest leading-none">{headlineEyebrow}</p>
              <p className="font-bold text-xl leading-tight mt-0.5">{headlineTitulo}</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-none text-white/50" />
          </div>
          <p className="text-sm text-white/75 mt-3 ml-[50px] leading-relaxed">{headlineSubtitulo}</p>
        </div>
      </Link>

      {/* Resultado strip — visível quando headline é urgência mas há recompras */}
      {showResultadoStrip && (
        <Link href="/comissoes" className="block">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-none shadow-sm">
              <RefreshCcw className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-widest">Resultado · 30 dias</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
                {fmt(totalRecomprasValor)} em recompras · {qtdRecompras} cliente{qtdRecompras !== 1 ? 's' : ''} voltou{qtdRecompras !== 1 ? 'aram' : ''}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-emerald-500 flex-none" />
          </div>
        </Link>
      )}

      {/* Métricas pessoais — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Minha fila" value={String(totalAtrasados + totalHoje)}
          sub={`${totalAtrasados} atrasado${totalAtrasados !== 1 ? 's' : ''}`}
          icon={<Bell className="h-5 w-5 text-white" />}
          iconBg={totalAtrasados > 0 ? 'bg-red-500' : 'bg-blue-500'}
          urgente={totalAtrasados > 0} href="/avisos" />
        <MetricCard label="Minhas recompras" value={String(qtdRecompras)}
          sub={fmt(totalRecomprasValor)}
          icon={<RefreshCcw className="h-5 w-5 text-white" />} iconBg="bg-green-500"
          href="/comissoes" />
        <MetricCard label="Minha comissão" value={fmt(totalComissoes)}
          sub={`${qtdVendas} venda${qtdVendas !== 1 ? 's' : ''}`}
          icon={<DollarSign className="h-5 w-5 text-white" />} iconBg="bg-emerald-600"
          href="/comissoes" />
        <MetricCard label="Potencial em aberto" value={fmt(previsaoEmAberto)}
          sub="comissão estimada"
          icon={<TrendingUp className="h-5 w-5 text-white" />} iconBg="bg-amber-500" />
      </div>

      {/* Avisos atrasados */}
      {avisosAtrasados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Atrasados — envie agora
            </p>
            <Link href="/avisos" className="text-xs text-muted-foreground hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {avisosAtrasados.map(a => (
              <AvisoEnvio key={a.id} aviso={a} urgente />
            ))}
          </div>
        </div>
      )}

      {/* Avisos de hoje */}
      {avisosHoje.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
              <Bell className="h-4 w-4" />
              Para hoje
            </p>
            <Link href="/avisos" className="text-xs text-muted-foreground hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-2">
            {avisosHoje.map(a => (
              <AvisoEnvio key={a.id} aviso={a} />
            ))}
          </div>
        </div>
      )}

      {/* Sem avisos pendentes */}
      {avisosAtrasados.length === 0 && avisosHoje.length === 0 && (
        <div className="rounded-2xl border bg-card p-6 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <p className="font-semibold text-sm">Fila zerada!</p>
          <p className="text-xs text-muted-foreground">Você está em dia com todos os clientes.</p>
          <Link href="/avisos" className="text-xs text-primary hover:underline block mt-2">
            Ver histórico de avisos →
          </Link>
        </div>
      )}

      {/* Gráfico comissão acumulada */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Comissão acumulada do mês</h2>
            {metaComissao ? (
              <p className="text-xs text-muted-foreground mt-0.5">Meta: {fmt(metaComissao)}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Meta ainda não configurada</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{diasMes[0]?.slice(0, 7).replace('-', '/')}</span>
        </div>
        <ComissaoChart diasMes={diasMes} comissaoDiaria={comissaoDiaria} metaValor={metaComissao} hojeDia={hojeDia} />
        <div className="grid grid-cols-3 mt-4 pt-4 border-t gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Minha comissão</p>
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

      {/* CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/vendas/nova"
          className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 flex items-center justify-between gap-3 shadow-md hover:shadow-lg transition-shadow"
        >
          <div>
            <p className="font-bold text-base">Registrar nova venda</p>
            <p className="text-sm text-white/80 mt-0.5">Gera avisos automáticos de recompra.</p>
          </div>
          <ChevronRight className="h-6 w-6 flex-none text-white/60" />
        </Link>
        <Link
          href="/avisos"
          className="rounded-2xl border bg-card p-5 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="font-bold text-base">Ver meus avisos</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalAtrasados + totalHoje > 0
                ? `${totalAtrasados + totalHoje} aviso${totalAtrasados + totalHoje !== 1 ? 's' : ''} pendente${totalAtrasados + totalHoje !== 1 ? 's' : ''}`
                : 'Fila de mensagens para clientes'}
            </p>
          </div>
          <ChevronRight className="h-6 w-6 flex-none text-muted-foreground" />
        </Link>
      </div>
    </div>
  )
}

function AvisoEnvio({ aviso, urgente }: { aviso: DashboardAviso; urgente?: boolean }) {
  const numero = aviso.cliente_whatsapp.replace(/\D/g, '')
  const waLink = `https://wa.me/55${numero}?text=${encodeURIComponent(aviso.texto_renderizado)}`

  return (
    <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${
      urgente ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold truncate">{aviso.cliente_nome}</p>
          <span className={`inline-flex flex-none items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            TIPO_COR[aviso.tipo] ?? 'bg-gray-100 text-gray-600'
          }`}>
            {TIPO_LABEL[aviso.tipo] ?? aviso.tipo}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{aviso.produto_nome}</p>
        {urgente && (
          <div className="flex items-center gap-1 mt-1.5">
            <AlertCircle className="h-3 w-3 text-red-500 flex-none" />
            <p className="text-xs text-red-600">
              Previsto para {new Date(aviso.data_aviso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </p>
          </div>
        )}
      </div>
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-none rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-bold px-4 py-2.5 transition-colors shadow-sm"
      >
        Enviar
      </a>
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
    <div className={`rounded-2xl border bg-card p-4 flex flex-col gap-3 h-full transition-shadow hover:shadow-md ${urgente ? 'border-red-200 bg-red-50/60' : ''}`}>
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-none shadow-sm`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold tabular-nums mt-0.5 ${urgente ? 'text-red-700' : ''}`}>{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </div>
    </div>
  )
  if (href) return <Link href={href} className="block">{content}</Link>
  return content
}
