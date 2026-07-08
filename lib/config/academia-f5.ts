export type SubtipoMaterial = 'video' | 'imagem_feed' | 'story' | 'pdf' | 'link'

export type ConteudoAcademia = {
  id: string
  titulo: string
  descricao: string
  parceiro: string
  nicho: string
  modulo: string
  produto: string
  tipo: 'treinamento' | 'material_divulgacao'
  subtipo?: SubtipoMaterial
  formato?: 'vertical' | 'horizontal' | 'quadrado'
  youtubeUrl?: string
  arquivoUrl?: string
  thumbnailUrl?: string
  creditos?: string
  tags?: string[]
  ativo: boolean
  ordem: number
}

export const conteudosAcademia: ConteudoAcademia[] = [
  {
    id: 'pv-woman',
    titulo: 'PiùFort Woman',
    descricao: 'Benefícios, perfil do cliente ideal e abordagem de recompra para o PiùFort Woman.',
    parceiro: 'PiùVita',
    nicho: 'Suplementos / Produtos naturais',
    modulo: 'Linha PiùFort',
    produto: 'PiùFort Woman',
    tipo: 'treinamento',
    formato: 'vertical',
    youtubeUrl: 'https://youtube.com/shorts/JG1dkeD5MZU',
    creditos: 'Nutricionista Luciana Leães',
    tags: ['piuvita', 'piufort', 'woman'],
    ativo: true,
    ordem: 1,
  },
  {
    id: 'pv-imune',
    titulo: 'PiùFort Imune',
    descricao: 'Sazonalidade, upsell e como conectar o PiùFort Imune ao ciclo de recompra da loja.',
    parceiro: 'PiùVita',
    nicho: 'Suplementos / Produtos naturais',
    modulo: 'Linha PiùFort',
    produto: 'PiùFort Imune',
    tipo: 'treinamento',
    formato: 'vertical',
    youtubeUrl: 'https://youtube.com/shorts/4ovZIK7g3Rw',
    creditos: 'Nutricionista Luciana Leães',
    tags: ['piuvita', 'piufort', 'imune'],
    ativo: true,
    ordem: 2,
  },
  {
    id: 'pv-gestan',
    titulo: 'PiùFort Gestan',
    descricao: 'Indicações, perfil do cliente e como abordar o PiùFort Gestan com segurança e naturalidade.',
    parceiro: 'PiùVita',
    nicho: 'Suplementos / Produtos naturais',
    modulo: 'Linha PiùFort',
    produto: 'PiùFort Gestan',
    tipo: 'treinamento',
    formato: 'vertical',
    youtubeUrl: 'https://youtube.com/shorts/f7jkIBCDz_s',
    creditos: 'Nutricionista Luciana Leães',
    tags: ['piuvita', 'piufort', 'gestan'],
    ativo: true,
    ordem: 3,
  },
  {
    id: 'pv-antiox',
    titulo: 'PiùFort Antiox',
    descricao: 'Benefícios, argumentos de expert e abordagem de recompra para o PiùFort Antiox.',
    parceiro: 'PiùVita',
    nicho: 'Suplementos / Produtos naturais',
    modulo: 'Linha PiùFort',
    produto: 'PiùFort Antiox',
    tipo: 'treinamento',
    formato: 'vertical',
    youtubeUrl: 'https://youtube.com/shorts/y9AGNoWRkkU',
    creditos: 'Nutricionista Luciana Leães',
    tags: ['piuvita', 'piufort', 'antiox'],
    ativo: true,
    ordem: 4,
  },
  {
    id: 'pv-linha-piufort',
    titulo: 'Linha PiùFort',
    descricao: 'Visão geral da linha — como apresentar o portfólio e identificar o produto certo para cada cliente.',
    parceiro: 'PiùVita',
    nicho: 'Suplementos / Produtos naturais',
    modulo: 'Linha PiùFort',
    produto: 'Linha PiùFort',
    tipo: 'treinamento',
    formato: 'vertical',
    youtubeUrl: 'https://youtube.com/shorts/CMYj71JebnY',
    creditos: 'Nutricionista Luciana Leães',
    tags: ['piuvita', 'piufort', 'linha'],
    ativo: true,
    ordem: 5,
  },
  {
    id: 'pv-slim',
    titulo: 'PiùFort Slim',
    descricao: 'Sazonalidade, perfil do cliente e como posicionar o PiùFort Slim como aliado do dia a dia.',
    parceiro: 'PiùVita',
    nicho: 'Suplementos / Produtos naturais',
    modulo: 'Linha PiùFort',
    produto: 'PiùFort Slim',
    tipo: 'treinamento',
    formato: 'horizontal',
    youtubeUrl: 'https://youtu.be/HvTWdHiUwy0',
    creditos: 'Nutricionista Luciana Leães',
    tags: ['piuvita', 'piufort', 'slim'],
    ativo: true,
    ordem: 6,
  },
]

export const treinamentosAcademia = conteudosAcademia.filter(
  c => c.tipo === 'treinamento' && c.ativo
)

export const materiaisAcademia = conteudosAcademia.filter(
  c => c.tipo === 'material_divulgacao' && c.ativo
)
