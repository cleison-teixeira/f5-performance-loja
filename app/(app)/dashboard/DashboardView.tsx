import { DashboardDono } from './DashboardDono'
import { DashboardGerente } from './DashboardGerente'
import { DashboardVendedora } from './DashboardVendedora'
import type {
  DashboardAviso, FunilStep, ProdutoRadarItem, VendedoraRanking, VendedoraComPendencia,
  VendedoraRankingMeta, DinheiroMesaInfo, AvisosPrazoInfo, ProdutoTopMes,
} from './page'

interface Props {
  loja: { id: string; nome: string }
  role: string
  nomeVendedora: string
  totalVendasValor: number
  qtdVendas: number
  totalRecomprasValor: number
  qtdRecompras: number
  totalComissoes: number
  previsaoEmAberto: number
  avisosPendentes: number
  avisosAtrasados: DashboardAviso[]
  avisosHoje: DashboardAviso[]
  avisosEnviadosCount: number
  dinheiroNaMesa: number
  funil: FunilStep[]
  produtosRadar: ProdutoRadarItem[]
  rankingVendedoras: VendedoraRanking[]
  vendedorasComPendencias: VendedoraComPendencia[]
  diasMes: string[]
  comissaoDiaria: number[]
  metaComissao: number | null
  hojeDia: number
  dinheiroMesaInfo: DinheiroMesaInfo
  totalVendasMes: number
  metaVendasMes: number | null
  diasRestantes: number
  rankingMes: VendedoraRankingMeta[]
  avisosPrazo: AvisosPrazoInfo
  topProdutosMes: ProdutoTopMes[]
  vendasDiariaMes: number[]
  mesLabel: string
}

export function DashboardView(props: Props) {
  const { role } = props

  if (role === 'vendedora') {
    return (
      <DashboardVendedora
        nomeVendedora={props.nomeVendedora}
        totalVendasValor={props.totalVendasValor}
        qtdVendas={props.qtdVendas}
        totalRecomprasValor={props.totalRecomprasValor}
        qtdRecompras={props.qtdRecompras}
        totalComissoes={props.totalComissoes}
        previsaoEmAberto={props.previsaoEmAberto}
        avisosAtrasados={props.avisosAtrasados}
        avisosHoje={props.avisosHoje}
        diasMes={props.diasMes}
        comissaoDiaria={props.comissaoDiaria}
        metaComissao={props.metaComissao}
        hojeDia={props.hojeDia}
      />
    )
  }

  if (role === 'gerente') {
    return (
      <DashboardGerente
        loja={props.loja}
        totalVendasValor={props.totalVendasValor}
        qtdVendas={props.qtdVendas}
        totalRecomprasValor={props.totalRecomprasValor}
        qtdRecompras={props.qtdRecompras}
        totalComissoes={props.totalComissoes}
        qtdAvisosAtrasados={props.avisosAtrasados.length}
        qtdAvisosHoje={props.avisosHoje.length}
        avisosEnviadosCount={props.avisosEnviadosCount}
        vendedorasComPendencias={props.vendedorasComPendencias}
        funil={props.funil}
        produtosRadar={props.produtosRadar}
        rankingVendedoras={props.rankingVendedoras}
        diasMes={props.diasMes}
        comissaoDiaria={props.comissaoDiaria}
        metaComissao={props.metaComissao}
        hojeDia={props.hojeDia}
      />
    )
  }

  // dono + admin_f5
  return (
    <DashboardDono
      loja={props.loja}
      dinheiroMesaInfo={props.dinheiroMesaInfo}
      totalVendasMes={props.totalVendasMes}
      metaVendasMes={props.metaVendasMes}
      diasRestantes={props.diasRestantes}
      rankingMes={props.rankingMes}
      avisosPrazo={props.avisosPrazo}
      topProdutosMes={props.topProdutosMes}
      vendasDiariaMes={props.vendasDiariaMes}
      diasMes={props.diasMes}
      hojeDia={props.hojeDia}
      mesLabel={props.mesLabel}
    />
  )
}
