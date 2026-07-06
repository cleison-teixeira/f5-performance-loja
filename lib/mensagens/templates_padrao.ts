export const TEMPLATES_PADRAO = [
  {
    ordem: 1 as const,
    tipo: 'agradecimento' as const,
    dias_apos_venda: 0,
    texto: 'Olá, aqui é a {vendedora} da {loja}. Estou passando para agradecer pela sua compra. Peço que salve meu contato porque vou acompanhar sua evolução com {produto} nos próximos dias.',
  },
  {
    ordem: 2 as const,
    tipo: 'relacionamento' as const,
    dias_apos_venda: 15,
    texto: 'Oi {cliente}! Como está sendo sua experiência com {produto}? Sou {vendedora} da {loja}, qualquer dúvida é só me chamar!',
  },
  {
    ordem: 3 as const,
    tipo: 'recompra' as const,
    dias_apos_venda: 25,
    texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. Seu {produto} deve estar acabando em breve! Quer garantir já o próximo?',
  },
] as const

export const TEMPLATE_OFERTA = {
  ordem: 4 as const,
  tipo: 'oferta' as const,
  dias_apos_venda: 45,
  texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. Temos uma novidade especial de {produto} para você. Quer saber mais?',
}

export const TEMPLATE_FOLLOW_UP = {
  ordem: 5 as const,
  tipo: 'follow_up' as const,
  dias_apos_venda: 32,
  texto: 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe o {produto}. Posso deixar reservado para você até o fim do dia?',
}

export interface TemplateEstilo {
  ordem: 1 | 2 | 3 | 4 | 5
  tipo: 'agradecimento' | 'relacionamento' | 'recompra' | 'oferta' | 'follow_up'
  texto: string
}

export const TEMPLATES_POR_ESTILO: Record<string, TemplateEstilo[]> = {
  clean: [
    { ordem: 1, tipo: 'agradecimento', texto: 'Olá, aqui é a {vendedora} da {loja}. Estou passando para agradecer pela sua compra. Peço que salve meu contato porque vou acompanhar sua evolução com {produto} nos próximos dias.' },
    { ordem: 2, tipo: 'relacionamento', texto: 'Oi {cliente}! Como está sendo sua experiência com {produto}? Sou {vendedora} da {loja}, qualquer dúvida é só me chamar!' },
    { ordem: 3, tipo: 'recompra', texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. Seu {produto} deve estar acabando em breve! Quer garantir já o próximo?' },
    { ordem: 4, tipo: 'oferta', texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. Temos uma novidade especial de {produto} para você. Quer saber mais?' },
    { ordem: 5, tipo: 'follow_up', texto: 'Oi {cliente}, passando só para confirmar se você ainda quer que eu separe o {produto}. Posso deixar reservado para você até o fim do dia?' },
  ],
  consultivo: [
    { ordem: 1, tipo: 'agradecimento', texto: 'Olá, {cliente}! Aqui é {vendedora} da {loja}. Muito obrigada pela confiança e pela compra do {produto}! Salve meu contato — vou acompanhar você nessa jornada e estou disponível para qualquer dúvida.' },
    { ordem: 2, tipo: 'relacionamento', texto: 'Oi {cliente}! Aqui é {vendedora} da {loja}. Como você está se sentindo com o {produto}? Tem alguma dúvida ou precisa de orientação? Estou aqui para te ajudar!' },
    { ordem: 3, tipo: 'recompra', texto: 'Oi {cliente}! Como está indo com o {produto}? Deve estar chegando ao final em breve. Quando precisar repor, é só me chamar — cuido do seu próximo com toda atenção!' },
    { ordem: 4, tipo: 'oferta', texto: 'Oi {cliente}! {vendedora} da {loja} aqui. Tenho uma oportunidade com {produto} que pode ser muito útil para você neste momento. Posso te apresentar?' },
    { ordem: 5, tipo: 'follow_up', texto: 'Oi {cliente}, tudo bem? Passando para confirmar se posso separar o {produto} para você. Me avise até hoje para eu garantir sua reposição!' },
  ],
  persuasivo: [
    { ordem: 1, tipo: 'agradecimento', texto: 'Oi {cliente}! Sou {vendedora} da {loja} e queria agradecer pela compra do {produto}. Salva meu número — vou acompanhar seu progresso e isso vai fazer diferença nos seus resultados!' },
    { ordem: 2, tipo: 'relacionamento', texto: 'Oi {cliente}! {vendedora} aqui da {loja}. Quem mantém o uso do {produto} com consistência vê resultados muito melhores. Como está indo? Posso ajudar em algo?' },
    { ordem: 3, tipo: 'recompra', texto: 'Oi {cliente}! Seu {produto} deve estar terminando — e interromper agora significa perder o que você já conquistou! Garante já o próximo para manter os resultados?' },
    { ordem: 4, tipo: 'oferta', texto: 'Oi {cliente}! Oportunidade exclusiva em {produto} só para clientes como você. Não consigo garantir essa condição por muito tempo. Quer aproveitar antes de encerrar?' },
    { ordem: 5, tipo: 'follow_up', texto: 'Oi {cliente}! Última chance de garantir seu {produto} com essa condição especial. Posso reservar para você ainda hoje?' },
  ],
  incentivo: [
    { ordem: 1, tipo: 'agradecimento', texto: 'Olá {cliente}! Aqui é {vendedora} da {loja}. Obrigada pela compra do {produto}! Salve meu contato — clientes cadastrados têm vantagens exclusivas em cada reposição aqui na loja.' },
    { ordem: 2, tipo: 'relacionamento', texto: 'Oi {cliente}! {vendedora} da {loja} aqui. Como está o {produto}? Nossos clientes especiais têm condições diferenciadas na próxima compra. Pode contar comigo!' },
    { ordem: 3, tipo: 'recompra', texto: 'Oi {cliente}! Seu {produto} deve estar acabando. Clientes que repõem sem interromper têm vantagens na {loja}. Quer garantir já o seu com condição especial?' },
    { ordem: 4, tipo: 'oferta', texto: 'Oi {cliente}! Preparei algo especial para você em {produto}. Uma condição exclusiva para quem já é nosso cliente. Quer saber mais?' },
    { ordem: 5, tipo: 'follow_up', texto: 'Oi {cliente}! Separei uma condição especial de {produto} especialmente para você. Preciso da sua confirmação hoje para garantir. Posso contar com você?' },
  ],
}
