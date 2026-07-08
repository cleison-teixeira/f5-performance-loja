import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardVendedora } from '@/app/(app)/dashboard/DashboardVendedora'
import { DashboardDono } from '@/app/(app)/dashboard/DashboardDono'
import type { DashboardAviso, FunilStep, ProdutoRadarItem, VendedoraRanking } from '@/app/(app)/dashboard/page'

// Forçar renderização dinâmica para que o check de NODE_ENV aconteça em runtime
export const dynamic = 'force-dynamic'

export default function DebugMobileAccessPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  // ── Datas ──────────────────────────────────────────────────────────────────
  const hoje = new Date().toISOString().split('T')[0]
  const d5 = new Date(Date.now() - 5 * 86_400_000).toISOString().split('T')[0]
  const d3 = new Date(Date.now() - 3 * 86_400_000).toISOString().split('T')[0]

  // ── Mock avisos ──────────────────────────────────────────────────────────
  const avisosAtrasados: DashboardAviso[] = [
    {
      id: 'mock-1', data_aviso: d5, venda_id: 'v1', status: 'aberta', recompra_id: null,
      texto_renderizado: 'Olá Maria! Passando pra saber como você está gostando do Creme Premium. Precisando de mais, pode chamar! 😊',
      cliente_nome: 'Maria Aparecida', cliente_whatsapp: '48988000001',
      produto_nome: 'Creme Premium', tipo: 'recompra',
      atrasado: true, vendedora_id: 'mock', vendedora_nome: 'Preview',
      previsao_comissao: 45, valor_venda: 300,
    },
    {
      id: 'mock-2', data_aviso: d3, venda_id: 'v2', status: 'aberta', recompra_id: null,
      texto_renderizado: 'Oi Joana! Temos uma oferta especial no Sérum que você amou. Quer ver?',
      cliente_nome: 'Joana Rodrigues', cliente_whatsapp: '48988000002',
      produto_nome: 'Sérum Vitamina C', tipo: 'oferta',
      atrasado: true, vendedora_id: 'mock', vendedora_nome: 'Preview',
      previsao_comissao: 30, valor_venda: 200,
    },
  ]

  const avisosHoje: DashboardAviso[] = [
    {
      id: 'mock-3', data_aviso: hoje, venda_id: 'v3', status: 'aberta', recompra_id: null,
      texto_renderizado: 'Oi Ana! Hoje completou 30 dias desde sua última compra. Temos condições especiais! 💄',
      cliente_nome: 'Ana Paula', cliente_whatsapp: '48988000003',
      produto_nome: 'Base Líquida', tipo: 'relacionamento',
      atrasado: false, vendedora_id: 'mock', vendedora_nome: 'Preview',
      previsao_comissao: 25, valor_venda: 180,
    },
    {
      id: 'mock-4', data_aviso: hoje, venda_id: 'v4', status: 'aberta', recompra_id: null,
      texto_renderizado: 'Olá Fernanda! Como está a Paleta de Sombras que você comprou? 😍',
      cliente_nome: 'Fernanda Lima', cliente_whatsapp: '48988000004',
      produto_nome: 'Paleta de Sombras', tipo: 'agradecimento',
      atrasado: false, vendedora_id: 'mock', vendedora_nome: 'Preview',
      previsao_comissao: 20, valor_venda: 150,
    },
  ]

  // ── Chart (mês corrente) ─────────────────────────────────────────────────
  const agora = new Date()
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasMes = Array.from({ length: diasNoMes }, (_, i) =>
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
  )
  const hojeDia = agora.getDate()

  // Comissão diária simulada
  const comissaoDiaria = Array(diasNoMes).fill(0)
  comissaoDiaria[3] = 120; comissaoDiaria[7] = 80; comissaoDiaria[12] = 200
  comissaoDiaria[17] = 60; comissaoDiaria[22] = 150

  // ── Funil ────────────────────────────────────────────────────────────────
  const funil: FunilStep[] = [
    { label: 'Vendas registradas', value: 24, cor: 'bg-blue-500' },
    { label: 'Mensagens programadas', value: 38, cor: 'bg-amber-500' },
    { label: 'Mensagens enviadas', value: 21, cor: 'bg-green-500' },
    { label: 'Recompras confirmadas', value: 7, cor: 'bg-emerald-600' },
  ]

  // ── Radar de produtos ────────────────────────────────────────────────────
  const produtosRadar: ProdutoRadarItem[] = [
    { nome: 'Creme Premium', total: 4200, foto_url: null, avisos_pendentes: 3 },
    { nome: 'Sérum Vitamina C', total: 3100, foto_url: null, avisos_pendentes: 2 },
    { nome: 'Base Líquida', total: 2800, foto_url: null, avisos_pendentes: 1 },
    { nome: 'Paleta de Sombras', total: 1900, foto_url: null, avisos_pendentes: 2 },
    { nome: 'Batom Matte', total: 1200, foto_url: null, avisos_pendentes: 0 },
    { nome: 'Máscara Cílios', total: 980, foto_url: null, avisos_pendentes: 1 },
  ]

  // ── Ranking ─────────────────────────────────────────────────────────────
  const rankingVendedoras: VendedoraRanking[] = [
    { nome: 'Ana Beatriz Costa', total: 8400, qtd: 12 },
    { nome: 'Carla Menezes', total: 6200, qtd: 9 },
    { nome: 'Débora Santos', total: 4800, qtd: 7 },
    { nome: 'Elaine Ferreira', total: 3100, qtd: 5 },
    { nome: 'Fabiana Rocha', total: 1900, qtd: 3 },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-col flex-1 min-w-0">

        {/* Banner de preview */}
        <div className="bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
          <span>⚠ MODO PREVIEW — dados simulados — sem autenticação</span>
          <a href="/debug/mobile-login" className="underline opacity-80 hover:opacity-100">
            Entrar de verdade →
          </a>
        </div>

        <Header nomeUsuario="Preview Dev" />

        {/* Tabs para alternar entre views */}
        <div className="flex border-b bg-background sticky top-14 z-30">
          <a href="?view=vendedora" className="flex-1 text-center py-2.5 text-xs font-medium text-primary border-b-2 border-primary">Vendedora</a>
          <a href="?view=dono" className="flex-1 text-center py-2.5 text-xs font-medium text-muted-foreground">Dono / Admin</a>
        </div>

        <main className="flex-1 p-4 pb-24">
          <DashboardVendedora
            loja={{ id: 'debug', nome: 'CIA CIDADE AZUL - ANGELONI' }}
            nomeVendedora="Ana Beatriz Costa"
            avisosAtrasados={avisosAtrasados}
            avisosHoje={avisosHoje}
            listaEsperaInfo={{ qtdAguardando: 2, potencialEmAberto: 350, qtdAvisados: 1, convertidoValor: 0, qtdClientes: 2 }}
            avisosEnviadosCount={12}
            topProdutosMes={[]}
            totalRecomprasValorMes={0}
            qtdRecomprasMes={0}
            dinheiroMesaInfo={{ totalPotencial: 7200, qtdOportunidades: 14, potencial7Dias: 2400, qtdClientes7Dias: 8 }}
            topProdutosRecompra={[
              { nome: 'Creme Premium', qtd: 3, foto_url: null, valorRecuperadoMes: 0, qtdRecomprasMes: 0, qtdElegiveis: 0 },
              { nome: 'Sérum Vitamina C', qtd: 2, foto_url: null, valorRecuperadoMes: 0, qtdRecomprasMes: 0, qtdElegiveis: 0 },
            ]}
          />
        </main>
      </div>
      <BottomNav role="dono" />
    </div>
  )
}
