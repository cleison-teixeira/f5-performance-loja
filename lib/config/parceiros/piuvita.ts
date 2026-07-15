export type VideoCapacitacao = {
  id: string
  titulo: string
  descricao: string
  produto: string
  nicho: string
  formato?: 'vertical' | 'horizontal' | 'quadrado'
  youtubeUrl?: string
  creditos?: string
  ativo: boolean
  ordem: number
}

export type ColecaoCapacitacao = {
  id: string
  titulo: string
  subtitulo?: string
  creditos?: string
  videos: VideoCapacitacao[]
}

export type ParceiroPerfil = {
  slug: string
  nome: string
  categoria: string
  descricao: string
  colecoes: ColecaoCapacitacao[]
}

export const piuvitaPerfil: ParceiroPerfil = {
  slug: 'piuvita',
  nome: 'PiùVita',
  categoria: 'Suplementos / Produtos naturais',
  descricao: 'Linha de suplementos naturais com protocolos clínicos para potencializar a recompra.',
  colecoes: [
    {
      id: 'piufort',
      titulo: 'Linha PiùFort',
      subtitulo: 'Com assinatura da Nutricionista Luciana Leães.',
      creditos: 'Nutricionista Luciana Leães',
      videos: [
        {
          id: 'pv-woman',
          titulo: 'PiùFort Woman',
          descricao: 'Benefícios, perfil do cliente ideal e abordagem de recompra para o PiùFort Woman.',
          produto: 'PiùFort Woman',
          nicho: 'Suplementos / Produtos naturais',
          formato: 'vertical',
          youtubeUrl: 'https://youtube.com/shorts/JG1dkeD5MZU',
          creditos: 'Nutricionista Luciana Leães',
          ativo: true,
          ordem: 1,
        },
        {
          id: 'pv-imune',
          titulo: 'PiùFort Imune',
          descricao: 'Sazonalidade, upsell e como conectar o PiùFort Imune ao ciclo de recompra da loja.',
          produto: 'PiùFort Imune',
          nicho: 'Suplementos / Produtos naturais',
          formato: 'vertical',
          youtubeUrl: 'https://youtube.com/shorts/4ovZiK7g3Rw',
          creditos: 'Nutricionista Luciana Leães',
          ativo: true,
          ordem: 2,
        },
        {
          id: 'pv-gestan',
          titulo: 'PiùFort Gestan',
          descricao: 'Indicações, perfil do cliente e como abordar o PiùFort Gestan com segurança e naturalidade.',
          produto: 'PiùFort Gestan',
          nicho: 'Suplementos / Produtos naturais',
          formato: 'vertical',
          youtubeUrl: 'https://youtube.com/shorts/f7jklBCDz_s',
          creditos: 'Nutricionista Luciana Leães',
          ativo: true,
          ordem: 3,
        },
        {
          id: 'pv-antiox',
          titulo: 'PiùFort Antiox',
          descricao: 'Benefícios, argumentos de expert e abordagem de recompra para o PiùFort Antiox.',
          produto: 'PiùFort Antiox',
          nicho: 'Suplementos / Produtos naturais',
          formato: 'vertical',
          youtubeUrl: 'https://youtube.com/shorts/y9AGNoWRkkU',
          creditos: 'Nutricionista Luciana Leães',
          ativo: true,
          ordem: 4,
        },
        {
          id: 'pv-linha-piufort',
          titulo: 'Linha PiùFort',
          descricao: 'Visão geral da linha — como apresentar o portfólio e identificar o produto certo para cada cliente.',
          produto: 'Linha PiùFort',
          nicho: 'Suplementos / Produtos naturais',
          formato: 'vertical',
          youtubeUrl: 'https://youtube.com/shorts/CMYj71JebnY',
          creditos: 'Nutricionista Luciana Leães',
          ativo: true,
          ordem: 5,
        },
        {
          id: 'pv-slim',
          titulo: 'PiùFort Slim',
          descricao: 'Sazonalidade, perfil do cliente e como posicionar o PiùFort Slim como aliado do dia a dia.',
          produto: 'PiùFort Slim',
          nicho: 'Suplementos / Produtos naturais',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/HvTWdHiUwy0',
          creditos: 'Nutricionista Luciana Leães',
          ativo: true,
          ordem: 6,
        },
      ],
    },
    {
      id: 'produtos-piuvita',
      titulo: 'Produtos PiùVita',
      subtitulo: 'Linha completa de suplementos.',
      creditos: 'PiùVita',
      videos: [
        {
          id: 'pv2-multi-az',
          titulo: 'Più Multi A-Z',
          descricao: 'Conheça os diferenciais do Più Multi A-Z, o perfil de cliente e como apresentar o multivitamínico de maneira simples, segura e consultiva.',
          produto: 'Più Multi A-Z',
          nicho: 'Vitaminas e minerais',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/gG6yao5JbCg',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 1,
        },
        {
          id: 'pv2-b12-metilfolato',
          titulo: 'B12 + Metilfolato',
          descricao: 'Conheça a fórmula B12 + Metilfolato, seus diferenciais e como explicar sua proposta nutricional de maneira responsável durante o atendimento.',
          produto: 'B12 + Metilfolato',
          nicho: 'Vitaminas e minerais',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/fZUls6RSI3Y',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 2,
        },
        {
          id: 'pv2-energy',
          titulo: 'Più Energy 1 e Più Energy 2',
          descricao: 'Entenda as diferenças entre Più Energy 1 e Più Energy 2 e como identificar corretamente cada oportunidade de atendimento.',
          produto: 'Più Energy',
          nicho: 'Energia e disposição',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/5vXBjje4OTw',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 3,
        },
        {
          id: 'pv2-brain',
          titulo: 'Più Brain',
          descricao: 'Conheça a proposta do Più Brain e aprenda como conversar com clientes que procuram suporte para foco, concentração e uma rotina mentalmente exigente.',
          produto: 'Più Brain',
          nicho: 'Foco e concentração',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/FfYuyEsuFwI',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 4,
        },
        {
          id: 'pv2-cuore-d3',
          titulo: 'Più Cuore D3',
          descricao: 'Conheça os diferenciais do Più Cuore D3 e aprenda a apresentar corretamente sua proposta nutricional durante o atendimento.',
          produto: 'Più Cuore D3',
          nicho: 'Vitaminas e minerais',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/IG1_nK5Pjig',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 5,
        },
        {
          id: 'pv2-mag',
          titulo: 'Più Mag + Magnésio',
          descricao: 'Aprenda a identificar clientes interessados em suplementação de magnésio e a explicar os diferenciais do produto com clareza e responsabilidade.',
          produto: 'Più Mag + Magnésio',
          nicho: 'Minerais',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/O9hZpsBJGdU',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 6,
        },
        {
          id: 'pv2-nac-pro',
          titulo: 'Linha Più NAC Pro',
          descricao: 'Conheça a proposta da linha Più NAC Pro, suas diferentes apresentações e os cuidados necessários para identificar corretamente cada produto.',
          produto: 'Linha Più NAC Pro',
          nicho: 'Antioxidantes',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/Zd7moDLs4n0',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 7,
        },
        {
          id: 'pv2-zen',
          titulo: 'Più Zen',
          descricao: 'Aprenda a apresentar o Più Zen para clientes que procuram equilíbrio e bem-estar, utilizando uma abordagem acolhedora e responsável.',
          produto: 'Più Zen',
          nicho: 'Bem-estar',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/HXjINdBlrPA',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 8,
        },
        {
          id: 'pv2-colageno',
          titulo: 'Più Max Colágeno',
          descricao: 'Conheça a proposta do Più Max Colágeno e aprenda a conduzir uma abordagem consultiva para clientes interessados em pele, cabelos, unhas e articulações.',
          produto: 'Più Max Colágeno',
          nicho: 'Colágeno',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/uv5h3Kq0NJs',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 9,
        },
        {
          id: 'pv2-cuore',
          titulo: 'Più Cuore',
          descricao: 'Conheça a composição e os diferenciais do Più Cuore e aprenda a apresentar sua proposta nutricional com segurança e responsabilidade.',
          produto: 'Più Cuore',
          nicho: 'Vitaminas e minerais',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/Vppq_KYJP-4',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 10,
        },
        {
          id: 'pv2-creatina',
          titulo: 'Creatina Efervescente PiùVita',
          descricao: 'Conheça os diferenciais da Creatina Efervescente PiùVita e aprenda a apresentá-la para clientes que buscam praticidade, força e desempenho físico.',
          produto: 'Creatina Efervescente',
          nicho: 'Performance esportiva',
          formato: 'horizontal',
          youtubeUrl: 'https://youtu.be/tCijPHw2cb0',
          creditos: 'PiùVita',
          ativo: true,
          ordem: 11,
        },
      ],
    },
  ],
}
