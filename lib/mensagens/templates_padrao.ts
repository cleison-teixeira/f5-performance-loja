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
