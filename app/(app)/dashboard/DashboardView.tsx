import { DashboardDono } from './DashboardDono'
import { DashboardGerente } from './DashboardGerente'
import { DashboardVendedora } from './DashboardVendedora'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import type {
  DashboardAviso, FunilStep, ProdutoRadarItem, VendedoraRanking, VendedoraComPendencia,
  VendedoraRankingMeta, DinheiroMesaInfo, AvisosPrazoInfo, ProdutoTopMes, ListaEsperaInfo,
  RankingRecomprasItem, TopProdutoRecompra, RankingLojasItem,
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
  listaEsperaInfo: ListaEsperaInfo
  rankingRecompras: RankingRecomprasItem[]
  topProdutosRecompra: TopProdutoRecompra[]
  totalRecomprasValorMes: number
  qtdRecomprasMes: number
  comissao7Dias: number
  rankingLojas: RankingLojasItem[]
  subtitulo?: string
}

export function DashboardView(props: Props) {
  const { role } = props

  if (isAcessoLoja(role)) {
    return (
      <DashboardGerente
        loja={props.loja}
        nomeUsuario={props.nomeVendedora}
        listaEsperaInfo={props.listaEsperaInfo}
        dinheiroMesaInfo={props.dinheiroMesaInfo}
        totalVendasMes={props.totalVendasMes}
        diasRestantes={props.diasRestantes}
        rankingMes={props.rankingMes}
        topProdutosMes={props.topProdutosMes}
        totalRecomprasValor={props.totalRecomprasValor}
        qtdRecompras={props.qtdRecompras}
        totalComissoes={props.totalComissoes}
        qtdAvisosAtrasados={props.avisosAtrasados.length}
        qtdAvisosHoje={props.avisosHoje.length}
        avisosEnviadosCount={props.avisosEnviadosCount}
        rankingRecompras={props.rankingRecompras}
        topProdutosRecompra={props.topProdutosRecompra}
        totalRecomprasValorMes={props.totalRecomprasValorMes}
        qtdRecomprasMes={props.qtdRecomprasMes}
      />
    )
  }

  // dono + admin_f5
  return (
    <DashboardDono
      loja={props.loja}
      nomeUsuario={props.nomeVendedora}
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
      listaEsperaInfo={props.listaEsperaInfo}
      totalRecomprasValor={props.totalRecomprasValor}
      qtdRecompras={props.qtdRecompras}
      totalComissoes={props.totalComissoes}
      avisosEnviadosCount={props.avisosEnviadosCount}
      rankingRecompras={props.rankingRecompras}
      topProdutosRecompra={props.topProdutosRecompra}
      totalRecomprasValorMes={props.totalRecomprasValorMes}
      qtdRecomprasMes={props.qtdRecomprasMes}
      rankingLojas={props.rankingLojas}
      subtitulo={props.subtitulo}
    />
  )
}
