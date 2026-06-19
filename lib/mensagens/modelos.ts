export const ORDENS_POR_MODELO: Record<1 | 2 | 3 | 4, number[]> = {
  1: [3],          // Recompra
  2: [1, 3],       // Agradecimento + Recompra
  3: [1, 2, 3],    // Agradecimento + Relacionamento + Recompra
  4: [1, 2, 3, 4], // Agradecimento + Relacionamento + Recompra + Oferta
}

export const MODELO_OPTIONS: { value: 1 | 2 | 3 | 4; label: string; tipos: string }[] = [
  { value: 1, label: '1 mensagem', tipos: 'Recompra' },
  { value: 2, label: '2 mensagens', tipos: 'Agradecimento + Recompra' },
  { value: 3, label: '3 mensagens', tipos: 'Agradecimento + Relacionamento + Recompra' },
  { value: 4, label: '4 mensagens', tipos: 'Agradecimento + Relacionamento + Recompra + Oferta' },
]
