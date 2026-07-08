'use client'

import { Clock, PlayCircle, GraduationCap, ExternalLink, BookOpen, ImageIcon, FileText, Link2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { treinamentosAcademia, materiaisAcademia, type ConteudoAcademia } from '@/lib/config/academia-f5'
import { youtubeEmbedUrl } from '@/lib/utils/youtube'

// ─── Tipos internos (F5 + Vendas) ────────────────────────────────────────────

interface TrainingItem {
  id: string
  title: string
  description: string
  category: string
  categoryColor: string
  status: 'available' | 'soon'
  duration?: string
  youtubeUrl?: string
}

const recwayItems: TrainingItem[] = [
  {
    id: 'venda-rapida',
    title: 'Como usar o Registrar',
    description: 'Registre compras em segundos, inclua itens do catálogo ou granel, e gere avisos automáticos de recompra.',
    category: 'Plataforma',
    categoryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    status: 'soon',
    duration: '5 min',
  },
  {
    id: 'avisos-recompra',
    title: 'Como acompanhar a Fila de Recompra',
    description: 'Entenda a fila de recompra, como enviar pelo WhatsApp e como recuperar clientes no momento certo.',
    category: 'Plataforma',
    categoryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    status: 'soon',
    duration: '8 min',
  },
  {
    id: 'lista-espera',
    title: 'Como usar a Lista de Espera',
    description: 'Registre demanda real dos clientes, evite perder vendas e use os dados para comprar melhor.',
    category: 'Plataforma',
    categoryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    status: 'soon',
    duration: '6 min',
  },
  {
    id: 'performance-equipe',
    title: 'Como acompanhar a performance da equipe',
    description: 'Veja quem está recuperando mais, quais produtos lideram e como usar o ranking para motivar a equipe.',
    category: 'Plataforma',
    categoryColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    status: 'soon',
    duration: '5 min',
  },
  {
    id: 'demanda-real',
    title: 'Como comprar melhor com demanda real',
    description: 'Use a Lista de Espera como inteligência de compra — saiba o que o cliente quer antes de pedir ao fornecedor.',
    category: 'Estratégia',
    categoryColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    status: 'soon',
    duration: '7 min',
  },
]

const vendasItems: TrainingItem[] = [
  {
    id: 'abordagem-recompra',
    title: 'Como abordar um cliente de recompra',
    description: 'A mensagem certa no momento certo transforma aviso em venda. Aprenda a abordagem sem pressão.',
    category: 'Vendas',
    categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    status: 'soon',
    duration: '6 min',
  },
  {
    id: 'cliente-parado',
    title: 'Como recuperar cliente parado',
    description: 'Técnicas para reativar clientes que sumiram sem parecer invasivo ou desesperado.',
    category: 'Vendas',
    categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    status: 'soon',
    duration: '8 min',
  },
  {
    id: 'vender-sem-insistir',
    title: 'Como vender sem parecer insistente',
    description: 'O aviso no timing certo elimina o desconforto de "estar vendendo". Aprenda o método dos avisos naturais.',
    category: 'Vendas',
    categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    status: 'soon',
    duration: '7 min',
  },
  {
    id: 'lista-espera-venda',
    title: 'Como transformar Lista de Espera em venda',
    description: 'Quando o produto chegar, como avisar o cliente certo, na hora certa, com a mensagem que fecha.',
    category: 'Vendas',
    categoryColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    status: 'soon',
    duration: '5 min',
  },
]

// ─── Componente: card de treinamento sem vídeo ───────────────────────────────

function TrainingCard({ item }: { item: TrainingItem }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.categoryColor}`}>
          {item.category}
        </span>
        {item.duration && (
          <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {item.duration}
          </span>
        )}
      </div>
      <div className="space-y-1 flex-1">
        <p className="text-sm font-semibold leading-snug">{item.title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
      </div>
      <div className="pt-2 border-t">
        {item.status === 'available' && item.youtubeUrl ? (
          <a
            href={item.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <PlayCircle className="h-4 w-4" />
            Assistir
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Em breve
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Componente: card de vídeo de parceiro com player embutido ───────────────

function VideoCard({ item }: { item: ConteudoAcademia }) {
  const embedUrl = item.youtubeUrl ? youtubeEmbedUrl(item.youtubeUrl) : null
  const isVertical = item.formato === 'vertical'

  return (
    <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
      {/* Player */}
      {embedUrl ? (
        <div className={isVertical ? 'bg-black flex justify-center' : ''}>
          <div className={
            isVertical
              ? 'w-full max-w-[260px] mx-auto aspect-[9/16]'
              : 'w-full aspect-video'
          }>
            <iframe
              src={`${embedUrl}?rel=0&modestbranding=1`}
              title={item.titulo}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <PlayCircle className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}

      {/* Info */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
            {item.produto}
          </span>
          <span className="inline-flex rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
            {item.parceiro}
          </span>
        </div>

        <div className="space-y-1 flex-1">
          <p className="text-sm font-semibold leading-snug">{item.titulo}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.descricao}</p>
          {item.creditos && (
            <p className="text-[11px] text-muted-foreground/60 mt-1">por {item.creditos}</p>
          )}
        </div>

        {item.youtubeUrl && (
          <div className="pt-2 border-t">
            <a
              href={item.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir no YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Componente: ícone por tipo de material ──────────────────────────────────

function MaterialIcon({ subtipo }: { subtipo?: string }) {
  if (subtipo === 'pdf') return <FileText className="h-5 w-5 text-muted-foreground/40" />
  if (subtipo === 'link') return <Link2 className="h-5 w-5 text-muted-foreground/40" />
  if (subtipo === 'imagem_feed' || subtipo === 'story') return <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
  return <PlayCircle className="h-5 w-5 text-muted-foreground/40" />
}

// ─── Componente: card de material de divulgação ──────────────────────────────

function MaterialCard({ item }: { item: ConteudoAcademia }) {
  const labelMap: Record<string, string> = {
    video: 'Vídeo',
    imagem_feed: 'Feed',
    story: 'Story',
    pdf: 'PDF',
    link: 'Link',
  }
  const label = item.subtipo ? (labelMap[item.subtipo] ?? item.subtipo) : 'Material'

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
        <MaterialIcon subtipo={item.subtipo} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
          {label}
        </span>
        {item.formato && (
          <span className="inline-flex rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            {item.formato}
          </span>
        )}
        <span className="inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
          {item.parceiro}
        </span>
      </div>

      <div className="space-y-1 flex-1">
        <p className="text-sm font-semibold leading-snug">{item.titulo}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{item.descricao}</p>
      </div>

      <div className="pt-2 border-t">
        {item.arquivoUrl ? (
          <a
            href={item.arquivoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {item.subtipo === 'pdf' ? 'Baixar material' : 'Abrir material'}
          </a>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Em breve
          </span>
        )}
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

type Secao = 'todos' | 'f5' | 'vendas' | 'parceiros' | 'piuvita' | 'materiais'

const TABS: { id: Secao; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'f5', label: 'Comece pelo F5' },
  { id: 'vendas', label: 'Vendas' },
  { id: 'parceiros', label: 'Parceiros' },
  { id: 'piuvita', label: 'PiùVita' },
  { id: 'materiais', label: 'Materiais' },
]

export default function TreinamentosPage() {
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>('todos')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const secao = params.get('secao') as Secao | null
    const validas: Secao[] = ['todos', 'f5', 'vendas', 'parceiros', 'piuvita', 'materiais']
    if (secao && validas.includes(secao)) setSecaoAtiva(secao)
  }, [])

  const piuvitaTreinamentos = treinamentosAcademia.filter(t => t.parceiro === 'PiùVita')
  const mostrarF5 = secaoAtiva === 'todos' || secaoAtiva === 'f5'
  const mostrarVendas = secaoAtiva === 'todos' || secaoAtiva === 'vendas'
  const mostrarParceiros = secaoAtiva === 'todos' || secaoAtiva === 'parceiros' || secaoAtiva === 'piuvita'
  const mostrarMateriais = secaoAtiva === 'materiais'

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold">Academia F5 Recompra</h1>
        <p className="text-sm text-muted-foreground">
          Treinamentos e materiais prontos para ajudar sua equipe a vender mais.
        </p>
      </div>

      {/* Intro */}
      <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
        <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aprenda a usar o F5, treine sua equipe e acesse conteúdos de parceiros para vender melhor os produtos da loja.
        </p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSecaoAtiva(tab.id)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              secaoAtiva === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/85 text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Seções */}
      <div className="space-y-8">

        {/* Comece pelo F5 */}
        {mostrarF5 && (
          <section className="space-y-3">
            <SectionHeader
              title="Comece pelo F5 Recompra"
              subtitle="Fundamentos da plataforma para toda a equipe."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recwayItems.map(item => (
                <TrainingCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Treinamento de Vendas */}
        {mostrarVendas && (
          <section className="space-y-3">
            <SectionHeader
              title="Treinamento de Vendas"
              subtitle="Técnicas práticas para converter avisos em vendas reais."
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vendasItems.map(item => (
                <TrainingCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* Parceiros */}
        {mostrarParceiros && (
          <section className="space-y-4">
            {secaoAtiva !== 'piuvita' && (
              <SectionHeader
                title="Treinamento de Parceiros"
                subtitle="Conteúdos exclusivos de parceiros para ajudar sua equipe a vender melhor cada produto."
              />
            )}

            {/* PiùVita */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="text-sm font-semibold">PiùVita</p>
                <span className="text-xs text-muted-foreground">Suplementos / Produtos naturais</span>
              </div>

              {secaoAtiva === 'piuvita' && (
                <p className="text-xs text-muted-foreground">
                  Linha PiùFort — com assinatura da Nutricionista Luciana Leães.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {piuvitaTreinamentos.map(item => (
                  <VideoCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Espaço para novos parceiros */}
            {secaoAtiva !== 'piuvita' && (
              <div className="rounded-xl border border-dashed p-5 text-center space-y-1.5">
                <p className="text-sm font-medium">Novos parceiros em breve</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Fornecedores parceiros terão uma área exclusiva de treinamento aqui.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Materiais de divulgação */}
        {mostrarMateriais && (
          <section className="space-y-4">
            <SectionHeader
              title="Materiais de divulgação"
              subtitle="Vídeos, imagens e PDFs prontos para usar nas redes sociais da loja."
            />

            {materiaisAcademia.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {materiaisAcademia.map(item => (
                  <MaterialCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium">Materiais em preparação</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Em breve parceiros disponibilizarão vídeos para reels, imagens de feed, stories e PDFs prontos para sua loja usar.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
