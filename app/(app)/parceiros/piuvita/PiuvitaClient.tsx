'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  PlayCircle, Package, Star, GraduationCap, Megaphone,
  RefreshCw, Building2, ChevronRight, CheckCircle2,
  ExternalLink, ArrowRight, ImageIcon, Clock, Bell,
  Video, FileText, Zap, Sparkles, Users,
} from 'lucide-react'
import { piuvitaPerfil, type VideoCapacitacao } from '@/lib/config/parceiros/piuvita'
import { youtubeVideoId, youtubeEmbedUrl } from '@/lib/utils/youtube'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProdutoCatalogo = {
  id: string
  nome: string
  foto_url: string | null
  preco_sugerido: number | null
  ciclo_recompra_dias: number | null
}

type AbaPortal = 'visao' | 'catalogo' | 'academia' | 'campanhas'
type FiltroAcademia = 'todos' | 'piufort' | 'produtos'

const ABAS_PORTAL: { id: AbaPortal; label: string }[] = [
  { id: 'visao', label: 'Visão da Marca' },
  { id: 'catalogo', label: 'Catálogo Comercial' },
  { id: 'academia', label: 'Academia da Marca' },
  { id: 'campanhas', label: 'Campanhas e Materiais' },
]

const FILTROS_ACADEMIA: { id: FiltroAcademia; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'piufort', label: 'Linha PiùFort' },
  { id: 'produtos', label: 'Produtos PiùVita' },
]

// ─── Static campaign data ─────────────────────────────────────────────────────

const CAMPANHAS_DESTAQUE = [
  {
    id: 'inverno-imune',
    badge: 'Campanha de Inverno',
    titulo: 'PiùFort Imune no inverno',
    subtitulo: 'Apoio para a equipe trabalhar o produto no mês de agosto',
    from: 'from-sky-500',
    to: 'to-teal-500',
    badgeBg: 'bg-white/20 text-white',
  },
  {
    id: 'linha-piufort',
    badge: 'Linha PiùFort',
    titulo: 'Campanha PiùFort',
    subtitulo: 'Abordagem sazonal e materiais para ativar recompra da linha',
    from: 'from-emerald-500',
    to: 'to-green-600',
    badgeBg: 'bg-white/20 text-white',
  },
  {
    id: 'creatina',
    badge: 'Performance',
    titulo: 'Creatina Efervescente PiùVita',
    subtitulo: 'Destaque para praticidade e performance esportiva',
    from: 'from-amber-500',
    to: 'to-orange-500',
    badgeBg: 'bg-white/20 text-white',
  },
]

const REELS_MARCA = [
  {
    id: 'reel-piuvita',
    titulo: 'Linha PiùVita — Visão geral',
    tag: 'Vídeo',
    accent: 'bg-emerald-600',
  },
  {
    id: 'reel-piufort',
    titulo: 'PiùFort — Campanha sazonal',
    tag: 'Reel',
    accent: 'bg-sky-600',
  },
  {
    id: 'reel-creatina',
    titulo: 'Creatina Efervescente — Lançamento',
    tag: 'Reel',
    accent: 'bg-amber-600',
  },
]

const CATEGORIAS_MATERIAIS = [
  { icon: Video, label: 'Vídeos promocionais' },
  { icon: ImageIcon, label: 'Artes para redes sociais' },
  { icon: FileText, label: 'Materiais de campanha' },
  { icon: Users, label: 'Conteúdos para vendedores' },
  { icon: Sparkles, label: 'Lançamentos' },
  { icon: Zap, label: 'Ações comerciais' },
]

const DRIVE_URL = 'https://drive.google.com/drive/folders/1R4a3BaG_FxFuz2shuMHtLqPyX3I0fK9x?usp=drive_link'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  logoUrl: string | null
  produtosCount: number
  role: string
  lojaId: string | null
  isInstalado: boolean
  produtosCatalogo: ProdutoCatalogo[]
}

// ─── VideoCard — embed inline, sem abrir YouTube externamente ───────────────

function VideoCard({ video, colecao }: { video: VideoCapacitacao; colecao: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const isVertical = video.formato === 'vertical'
  const vid = video.youtubeUrl ? youtubeVideoId(video.youtubeUrl) : null
  const thumb = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null
  const embedUrl = video.youtubeUrl ? youtubeEmbedUrl(video.youtubeUrl) : null

  return (
    <div className="rounded-xl border bg-card overflow-hidden flex flex-col hover:shadow-sm transition-shadow">

      {/* ── Área do vídeo ─────────────────────────────────────────────────── */}
      {isPlaying && embedUrl ? (
        isVertical ? (
          // Vertical (Shorts) — 9:16 centralizado com fundo preto
          <div className="flex justify-center bg-black">
            <div className="relative w-full max-w-[280px] aspect-[9/16]">
              <iframe
                src={`${embedUrl}?autoplay=1`}
                title={video.titulo}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        ) : (
          // Horizontal — 16:9 padrão
          <div className="relative aspect-video">
            <iframe
              src={`${embedUrl}?autoplay=1`}
              title={video.titulo}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )
      ) : (
        // Thumbnail com overlay de play — clicar inicia o embed
        <button
          onClick={() => setIsPlaying(true)}
          className="group relative w-full aspect-video bg-muted overflow-hidden block"
          aria-label={`Assistir ${video.titulo}`}
        >
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={video.titulo}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PlayCircle className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-white/70 group-hover:bg-white/95 transition-all scale-90 group-hover:scale-100 flex items-center justify-center shadow-md">
              <PlayCircle className="h-6 w-6 text-gray-900 translate-x-0.5" />
            </div>
          </div>
        </button>
      )}

      {/* ── Info do card ──────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-medium">
            PiùVita
          </span>
          <span className="inline-flex rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
            {colecao}
          </span>
          <span className="inline-flex rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
            {video.nicho}
          </span>
        </div>

        <div className="space-y-1 flex-1">
          <p className="text-sm font-semibold leading-snug">{video.titulo}</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{video.descricao}</p>
          {video.creditos && (
            <p className="text-[11px] text-muted-foreground/60 mt-1">por {video.creditos}</p>
          )}
        </div>

        <div className="pt-2 border-t">
          {isPlaying ? (
            <button
              onClick={() => setIsPlaying(false)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Fechar vídeo
            </button>
          ) : embedUrl ? (
            <button
              onClick={() => setIsPlaying(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <PlayCircle className="h-4 w-4" />
              Assistir capacitação
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── ProdutoCard ─────────────────────────────────────────────────────────────

function ProdutoCard({ produto }: { produto: ProdutoCatalogo }) {
  const cicloText = produto.ciclo_recompra_dias
    ? produto.ciclo_recompra_dias < 30
      ? `${produto.ciclo_recompra_dias} dias`
      : produto.ciclo_recompra_dias === 30
        ? '30 dias'
        : `${Math.round(produto.ciclo_recompra_dias / 30)} mês`
    : null

  const precoText = produto.preco_sugerido != null
    ? `R$ ${produto.preco_sugerido.toFixed(2).replace('.', ',')}`
    : null

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/40 transition-colors">
      {produto.foto_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={produto.foto_url}
          alt={produto.nome}
          className="w-10 h-10 rounded-md object-cover shrink-0 border bg-white"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
          <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{produto.nome}</p>
        <div className="flex flex-wrap gap-x-3 mt-0.5">
          {precoText && <span className="text-xs text-muted-foreground">{precoText}</span>}
          {cicloText && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              {cicloText}
            </span>
          )}
        </div>
      </div>
      <span className="flex items-center gap-1 text-[11px] text-primary/70 font-medium shrink-0 bg-primary/8 rounded-full px-2 py-0.5 whitespace-nowrap">
        <Bell className="h-3 w-3" />
        5 avisos
      </span>
    </div>
  )
}

// ─── Static data ──────────────────────────────────────────────────────────────

const PILARES = [
  {
    icon: Building2,
    titulo: 'Presença de marca',
    descricao: 'A PiùVita possui um espaço institucional próprio dentro do ambiente utilizado pelas lojas.',
  },
  {
    icon: GraduationCap,
    titulo: 'Equipe capacitada',
    descricao: 'Vendedores e gestores acessam conteúdos rápidos para conhecer os produtos e conduzir atendimentos mais seguros.',
  },
  {
    icon: Megaphone,
    titulo: 'Campanhas ativadas',
    descricao: 'Materiais e ações comerciais podem ser distribuídos diretamente às equipes das lojas.',
  },
  {
    icon: RefreshCw,
    titulo: 'Recompra fortalecida',
    descricao: 'Produtos, ciclos e mensagens ajudam as equipes a manter o relacionamento após a primeira venda.',
  },
]

// ─── Main component ──────────────────────────────────────────────────────────

export function PiuvitaClient({ logoUrl, produtosCount, role, lojaId, isInstalado, produtosCatalogo }: Props) {
  const [aba, setAba] = useState<AbaPortal>('visao')
  const [filtroAcademia, setFiltroAcademia] = useState<FiltroAcademia>('todos')

  const colecaoPiufort = piuvitaPerfil.colecoes.find(c => c.id === 'piufort')
  const colecaoProdutos = piuvitaPerfil.colecoes.find(c => c.id === 'produtos-piuvita')
  const totalCapacitacoes = piuvitaPerfil.colecoes.reduce((acc, c) => acc + c.videos.length, 0)

  const podeInstalar = role !== 'vendedora'

  const videosExibidos = (() => {
    if (filtroAcademia === 'piufort') return colecaoPiufort?.videos ?? []
    if (filtroAcademia === 'produtos') return colecaoProdutos?.videos ?? []
    return [...(colecaoPiufort?.videos ?? []), ...(colecaoProdutos?.videos ?? [])]
  })()

  const getColecaoLabel = (video: VideoCapacitacao): string =>
    colecaoPiufort?.videos.some(v => v.id === video.id) ? 'Linha PiùFort' : 'Produtos PiùVita'

  return (
    <div className="space-y-8">

      {/* ── Header da marca ───────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <div className="shrink-0 rounded-xl border bg-white px-3 py-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="PiùVita"
              className="h-10 w-auto max-w-[150px] object-contain"
            />
          </div>
        ) : (
          <div className="shrink-0 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xl select-none px-4 py-2">
            PiùVita
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{piuvitaPerfil.nome}</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/40 dark:text-amber-400 px-2.5 py-0.5 text-xs font-semibold">
              <Star className="h-3 w-3" />
              Parceiro Oficial F5
            </span>
          </div>
          <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-medium mt-1">
            {piuvitaPerfil.categoria}
          </span>
        </div>
      </div>

      {/* ── Abas principais ───────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {ABAS_PORTAL.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              aba === a.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/85 text-muted-foreground hover:text-foreground'
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* ══ ABA: Visão da Marca ════════════════════════════════════════════ */}
      {aba === 'visao' && (
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-foreground">
              Conteúdos e ferramentas para ajudar as equipes das lojas a conhecer, apresentar e gerar recompra dos produtos PiùVita.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Capacitação, catálogo e campanhas conectados à rotina comercial das lojas.
            </p>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {produtosCount > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-1">
                <p className="text-2xl font-bold">{produtosCount}</p>
                <p className="text-xs text-muted-foreground">Produtos no catálogo</p>
              </div>
            )}
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-2xl font-bold">{totalCapacitacoes}</p>
              <p className="text-xs text-muted-foreground">Capacitações disponíveis</p>
            </div>
            <div className="rounded-xl border bg-card p-4 space-y-1">
              <p className="text-2xl font-bold">{CAMPANHAS_DESTAQUE.length}</p>
              <p className="text-xs text-muted-foreground">Campanhas disponíveis</p>
            </div>
          </div>

          {/* Pilares */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pilares da parceria</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PILARES.map(pilar => (
                <div key={pilar.titulo} className="rounded-xl border bg-card p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <pilar.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold">{pilar.titulo}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{pilar.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Atalhos — ordem operacional: Academia > Campanhas > Catálogo */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acesso rápido</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setAba('academia')}
                className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors group text-left"
              >
                <GraduationCap className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Academia da Marca</p>
                  <p className="text-xs text-muted-foreground">{totalCapacitacoes} capacitações</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setAba('campanhas')}
                className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors group text-left"
              >
                <Megaphone className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Campanhas e Materiais</p>
                  <p className="text-xs text-muted-foreground">Central de ativos</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setAba('catalogo')}
                className="rounded-xl border bg-card p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors group text-left"
              >
                <Package className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Catálogo Comercial</p>
                  {produtosCount > 0 && (
                    <p className="text-xs text-muted-foreground">{produtosCount} produto{produtosCount !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ABA: Catálogo Comercial ════════════════════════════════════════ */}
      {aba === 'catalogo' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Catálogo Comercial PiùVita</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Produtos preparados para serem instalados na loja com fotos, ciclos de recompra e mensagens comerciais configuradas.
            </p>
          </div>

          {/* Banner de valor */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
            <p className="text-sm text-primary/80 leading-relaxed font-medium">
              Catálogo pronto para vender e recomprar: produtos com preço sugerido, ciclo configurado e 5 avisos comerciais já preparados.
            </p>
          </div>

          {/* Pilares do catálogo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border bg-card p-3 text-center space-y-1.5">
              <Package className="h-5 w-5 text-primary mx-auto" />
              {produtosCount > 0 && <p className="text-lg font-bold leading-none">{produtosCount}</p>}
              <p className="text-[11px] text-muted-foreground leading-tight">Produtos prontos</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center space-y-1.5">
              <CheckCircle2 className="h-5 w-5 text-primary mx-auto" />
              <p className="text-[11px] text-muted-foreground leading-tight">Preços sugeridos</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center space-y-1.5">
              <Clock className="h-5 w-5 text-primary mx-auto" />
              <p className="text-[11px] text-muted-foreground leading-tight">Ciclos configurados</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center space-y-1.5">
              <Bell className="h-5 w-5 text-primary mx-auto" />
              <p className="text-[11px] text-muted-foreground leading-tight">5 avisos configurados</p>
            </div>
          </div>

          {/* Status de instalação + CTA */}
          {podeInstalar && (
            <div className={cn(
              'rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4',
              isInstalado
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40'
                : 'bg-card'
            )}>
              {isInstalado ? (
                <>
                  <div className="flex items-center gap-3 flex-1">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Catálogo instalado</p>
                      <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Os produtos estão disponíveis na loja.</p>
                    </div>
                  </div>
                  <Link
                    href="/configuracoes/produtos"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 transition-colors shrink-0"
                  >
                    Ver catálogo instalado
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Catálogo não instalado</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Instale para liberar os produtos e os 5 avisos automáticos na sua loja.</p>
                  </div>
                  <Link
                    href="/configuracoes/bibliotecas"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                  >
                    <Package className="h-4 w-4" />
                    Instalar catálogo PiùVita
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Lista de produtos */}
          {produtosCatalogo.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {produtosCatalogo.length} produto{produtosCatalogo.length !== 1 ? 's' : ''} disponíveis
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {produtosCatalogo.map(p => (
                  <ProdutoCard key={p.id} produto={p} />
                ))}
              </div>
            </div>
          ) : produtosCount > 0 ? (
            <div className="rounded-xl border bg-muted/30 p-6 text-center space-y-1.5">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium">{produtosCount} produtos disponíveis</p>
              <p className="text-xs text-muted-foreground">Instale o catálogo para ver os detalhes.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center space-y-1.5">
              <Package className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Catálogo em configuração.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ ABA: Academia da Marca ════════════════════════════════════════ */}
      {aba === 'academia' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Academia PiùVita</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Capacitações rápidas para ajudar vendedores e gestores a conhecer os produtos e aprimorar a abordagem comercial.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada conteúdo foi organizado para facilitar o aprendizado da equipe e apoiar atendimentos mais claros, consultivos e responsáveis.
            </p>
          </div>

          {/* Filtros internos */}
          <div className="flex gap-2 flex-wrap">
            {FILTROS_ACADEMIA.map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroAcademia(f.id)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  filtroAcademia === f.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/85 text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
                {f.id === 'todos' && <span className="ml-1.5 text-xs opacity-70">{totalCapacitacoes}</span>}
                {f.id === 'piufort' && <span className="ml-1.5 text-xs opacity-70">{colecaoPiufort?.videos.length ?? 0}</span>}
                {f.id === 'produtos' && <span className="ml-1.5 text-xs opacity-70">{colecaoProdutos?.videos.length ?? 0}</span>}
              </button>
            ))}
          </div>

          {filtroAcademia === 'piufort' && colecaoPiufort?.subtitulo && (
            <p className="text-xs text-muted-foreground -mt-2">{colecaoPiufort.subtitulo}</p>
          )}
          {filtroAcademia === 'produtos' && colecaoProdutos?.subtitulo && (
            <p className="text-xs text-muted-foreground -mt-2">{colecaoProdutos.subtitulo}</p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videosExibidos.map(v => (
              <VideoCard key={v.id} video={v} colecao={getColecaoLabel(v)} />
            ))}
          </div>
        </div>
      )}

      {/* ══ ABA: Campanhas e Materiais ════════════════════════════════════ */}
      {aba === 'campanhas' && (
        <div className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Campanhas e Materiais PiùVita</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ativos comerciais disponibilizados pela marca para apoiar ações nas lojas, lançamentos e comunicação com os clientes.
            </p>
          </div>

          {/* ── Campanhas em destaque ─────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Campanhas em destaque</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CAMPANHAS_DESTAQUE.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    'rounded-xl overflow-hidden bg-gradient-to-br text-white flex flex-col min-h-[180px]',
                    c.from, c.to
                  )}
                >
                  {/* Decoração de fundo */}
                  <div className="relative flex-1 p-5 flex flex-col gap-3 overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full bg-white/10" />

                    <span className={cn('relative inline-flex self-start rounded-full px-2.5 py-1 text-[11px] font-semibold', c.badgeBg)}>
                      {c.badge}
                    </span>

                    <div className="relative space-y-1 flex-1">
                      <p className="text-sm font-bold leading-snug">{c.titulo}</p>
                      <p className="text-xs text-white/80 leading-relaxed">{c.subtitulo}</p>
                    </div>

                    <a
                      href={DRIVE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative inline-flex items-center gap-1.5 self-start rounded-lg bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Ver campanha
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Vídeos e Reels ─────────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Vídeos e Reels da marca</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {REELS_MARCA.map(r => (
                <a
                  key={r.id}
                  href={DRIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border bg-card overflow-hidden group hover:shadow-sm transition-shadow"
                >
                  <div className={cn('relative aspect-video flex items-center justify-center', r.accent)}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative w-12 h-12 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors flex items-center justify-center">
                      <PlayCircle className="h-7 w-7 text-white translate-x-0.5" />
                    </div>
                    <span className="absolute top-3 right-3 rounded-full bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5">
                      {r.tag}
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug">{r.titulo}</p>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* ── Materiais da marca ─────────────────────────────────────── */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Materiais da marca</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIAS_MATERIAIS.map(cat => (
                <div
                  key={cat.label}
                  className="rounded-xl border bg-card p-3.5 flex items-center gap-3 hover:bg-accent/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <cat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-xs font-medium leading-tight">{cat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Central de Ativos ──────────────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Central de Ativos PiùVita</h3>
            </div>
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Vídeos promocionais, artes, campanhas e materiais oficiais da marca reunidos em um único acesso.
                </p>
                <a
                  href={DRIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Acessar ativos da marca
                </a>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Novas campanhas e materiais poderão ser disponibilizados periodicamente pela marca.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
