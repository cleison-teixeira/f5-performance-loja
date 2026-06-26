import { Clock, PlayCircle, GraduationCap } from 'lucide-react'

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

interface PartnerItem extends TrainingItem {
  partner: string
}

const piuvitaItems: PartnerItem[] = [
  {
    id: 'pv-antiox',
    partner: 'PiùVita',
    title: 'Como vender Piufort Antiox',
    description: 'Benefícios, perfil do cliente ideal, argumentos com expert e abordagem de recompra para o Piùfort Antiox.',
    category: 'Produto',
    categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    status: 'soon',
    duration: '10 min',
  },
  {
    id: 'pv-slim',
    partner: 'PiùVita',
    title: 'Como vender Piufort Slim',
    description: 'Sazonalidade, perfil do cliente e como posicionar o Piùfort Slim como aliado do dia a dia.',
    category: 'Produto',
    categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    status: 'soon',
    duration: '10 min',
  },
  {
    id: 'pv-woman',
    partner: 'PiùVita',
    title: 'Como vender Piufort Woman',
    description: 'Foco feminino, benefícios, objeções comuns e como falar sobre o Piùfort Woman com naturalidade.',
    category: 'Produto',
    categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    status: 'soon',
    duration: '10 min',
  },
  {
    id: 'pv-imune',
    partner: 'PiùVita',
    title: 'Como vender Piufort Imune',
    description: 'Sazonalidade, upsell e como conectar o Piùfort Imune ao ciclo de recompra da loja.',
    category: 'Produto',
    categoryColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    status: 'soon',
    duration: '8 min',
  },
  {
    id: 'pv-argumentos',
    partner: 'PiùVita',
    title: 'Argumentos de venda PiuVita',
    description: 'Especialistas da PiùVita apresentam os principais diferenciais e como usar o portfólio para fidelizar clientes.',
    category: 'Expert',
    categoryColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    status: 'soon',
    duration: '15 min',
  },
  {
    id: 'pv-objecoes',
    partner: 'PiùVita',
    title: 'Objeções comuns PiuVita',
    description: 'Aprenda a contornar as principais objeções de preço, qualidade e benefícios dos suplementos PiuVita.',
    category: 'Expert',
    categoryColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    status: 'soon',
    duration: '12 min',
  },
]

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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-base font-semibold">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export default function TreinamentosPage() {
  return (
    <div className="space-y-8">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-semibold">Academia F5 Recompra</h1>
        <p className="text-sm text-muted-foreground">
          Treinamentos rápidos para sua equipe vender mais e usar melhor a plataforma.
        </p>
      </div>

      {/* Bloco de introdução */}
      <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
        <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Aprenda a usar o F5 Recompra, treine sua equipe e acesse conteúdos de parceiros
          para vender melhor os produtos da loja. Novos treinamentos chegam em breve.
        </p>
      </div>

      {/* Seção: Comece pelo F5 Recompra */}
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

      {/* Seção: Treinamentos de Vendas */}
      <section className="space-y-3">
        <SectionHeader
          title="Treinamentos de Vendas"
          subtitle="Técnicas práticas para converter avisos em vendas reais."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vendasItems.map(item => (
            <TrainingCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Seção: Treinamentos de Parceiros */}
      <section className="space-y-4">
        <SectionHeader
          title="Treinamentos de Parceiros"
          subtitle="Conteúdo exclusivo de fornecedores para ajudar sua equipe a vender melhor cada produto."
        />

        {/* PiùVita */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-sm font-semibold">PiùVita</p>
            <span className="text-xs text-muted-foreground">Suplementos e nutrição</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {piuvitaItems.map(item => (
              <TrainingCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Outros parceiros */}
        <div className="rounded-xl border border-dashed p-5 text-center space-y-1.5">
          <p className="text-sm font-medium">Novos parceiros em breve</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Fornecedores parceiros terão uma área exclusiva de treinamento aqui.
            Em breve mais conteúdo de especialistas.
          </p>
        </div>
      </section>

    </div>
  )
}
