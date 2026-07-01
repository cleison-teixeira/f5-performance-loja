export const NICHOS_OFICIAIS = [
  'Suplementos / Produtos naturais',
  'Beleza / Cosméticos',
  'Farmácia / Bem-estar',
  'Pet shop',
  'Alimentos / Mercado',
  'Casa / Limpeza',
  'Bebê / Infantil',
  'Agropecuária',
  'Ótica',
  'Outros'
] as const;

export type Nicho = typeof NICHOS_OFICIAIS[number];

export const CATEGORIAS_POR_NICHO: Record<Nicho, string[]> = {
  'Suplementos / Produtos naturais': [
    'Vitaminas e minerais',
    'Creatinas',
    'Proteínas',
    'Aminoácidos',
    'Pré-treino / Energia',
    'Metabolismo / Controle de peso',
    'Saúde intestinal / Probióticos',
    'Colágeno / Articulações',
    'Cabelo, pele e unhas',
    'Imunidade',
    'Sono / Relaxamento',
    'Saúde feminina / Gestante',
    'Saúde cardiovascular',
    'Cérebro / Foco / Cognição',
    'Fígado / Detox / Antioxidantes',
    'Fitoterápicos / Naturais',
    'Outros'
  ],
  'Beleza / Cosméticos': [
    'Cuidados faciais',
    'Cuidados corporais',
    'Cabelos',
    'Maquiagem',
    'Perfumes',
    'Dermocosméticos',
    'Proteção solar',
    'Unhas',
    'Higiene pessoal',
    'Masculino',
    'Outros'
  ],
  'Farmácia / Bem-estar': [
    'Vitaminas e suplementos',
    'Dermocosméticos',
    'Higiene pessoal',
    'Saúde bucal',
    'Mamãe e bebê',
    'Primeiros cuidados',
    'Bem-estar',
    'Outros'
  ],
  'Pet shop': [
    'Rações',
    'Petiscos',
    'Suplementos pet',
    'Higiene pet',
    'Areias e tapetes higiênicos',
    'Antipulgas / cuidados',
    'Brinquedos',
    'Acessórios',
    'Outros'
  ],
  'Alimentos / Mercado': [
    'Café / Chás',
    'Bebidas não alcoólicas',
    'Snacks',
    'Mercearia',
    'Alimentos saudáveis',
    'Congelados',
    'Doces / Chocolates',
    'Produtos sem glúten / sem lactose',
    'Outros'
  ],
  'Casa / Limpeza': [
    'Limpeza geral',
    'Lavanderia',
    'Cozinha',
    'Banheiro',
    'Aromatizadores',
    'Descartáveis',
    'Higiene doméstica',
    'Outros'
  ],
  'Bebê / Infantil': [
    'Fraldas',
    'Lenços umedecidos',
    'Higiene bebê',
    'Alimentação infantil',
    'Acessórios',
    'Cuidados da mãe',
    'Outros'
  ],
  'Agropecuária': [
    'Rações',
    'Suplementos animais',
    'Sementes',
    'Jardinagem',
    'Ferramentas',
    'Higiene animal',
    'Produtos rurais',
    'Outros'
  ],
  'Ótica': [
    'Lentes de contato',
    'Soluções de limpeza',
    'Colírios lubrificantes',
    'Óculos',
    'Acessórios',
    'Outros'
  ],
  'Outros': [
    'Outros'
  ]
};

export function getCategoriasDoNicho(nicho: string | null | undefined): string[] {
  if (!nicho) return ['Outros'];
  return CATEGORIAS_POR_NICHO[nicho as Nicho] || ['Outros'];
}

// Mapeamento específico dos 30 produtos da PiùVita para suas categorias padronizadas
export const PIUVITA_CATEGORIAS_MAP: Record<string, string> = {
  'acidofolicoc60': 'Saúde feminina / Gestante',
  'b12metilfolatoc60': 'Vitaminas e minerais',
  'coenzimaq10c60': 'Saúde cardiovascular',
  'complexobc60': 'Vitaminas e minerais',
  'creatinaefervescentemacaverde180g': 'Creatinas',
  'creatinaefervescentemacaverde360g': 'Creatinas',
  'creatinaefervescentenatural150g': 'Creatinas',
  'creatinaefervescentenatural360g': 'Creatinas',
  'creatinaefervescenteuva150g': 'Creatinas',
  'creatinaefervescenteuva180g': 'Creatinas',
  'creatinaefervescenteuva360g': 'Creatinas',
  'curcumac60': 'Fitoterápicos / Naturais',
  'melatoninac60': 'Sono / Relaxamento',
  'piuaminomixsachec30': 'Aminoácidos',
  'piubrainc60': 'Cérebro / Foco / Cognição',
  'piucuorec30': 'Saúde cardiovascular',
  'piucuored3c30': 'Saúde cardiovascular',
  'piuenergy1c60': 'Pré-treino / Energia',
  'piuenergy2c30': 'Pré-treino / Energia',
  'piumagmagnesioc60': 'Vitaminas e minerais',
  'piumaxcolagenoc30': 'Colágeno / Articulações',
  'piumultiazc60': 'Vitaminas e minerais',
  'piumultimulherc60': 'Saúde feminina / Gestante',
  'piunacpro200mgsachec30': 'Fígado / Detox / Antioxidantes',
  'piuzenc60': 'Sono / Relaxamento',
  'piufortantiox': 'Fígado / Detox / Antioxidantes',
  'piufortgestan': 'Saúde feminina / Gestante',
  'piufortimune': 'Imunidade',
  'piufortslim': 'Metabolismo / Controle de peso',
  'piufortwoman': 'Saúde feminina / Gestante'
};

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, '') // remove especiais e espaços para o match exato de chaves
    .trim();
}

export function normalizarNicho(nicho: string | null | undefined): string {
  if (!nicho || nicho.trim() === '') return ''
  const lower = nicho.toLowerCase().trim()
  if (lower === 'suplementos' || lower === 'suplementacao') return 'Suplementos / Produtos naturais'
  const match = NICHOS_OFICIAIS.find(n => n.toLowerCase() === lower)
  return match ?? 'Outros'
}

export function classificarProdutoPiuVita(nome: string): string {
  const norm = normalizarNome(nome);
  return PIUVITA_CATEGORIAS_MAP[norm] || 'Outros';
}

export function normalizarValorLegado(nichoLegado: string | null, categoriaLegada: string | null) {
  // Se for nulo ou vazio, mapeia para Outros
  let nicho = nichoLegado || 'Outros';
  let categoria = categoriaLegada || 'Outros';

  // Normalização de nicho
  if (nicho.toLowerCase() === 'suplementos' || nicho.toLowerCase() === 'suplementacao') {
    nicho = 'Suplementos / Produtos naturais';
  } else {
    // Procura por match exato case-insensitive
    const match = NICHOS_OFICIAIS.find(n => n.toLowerCase() === nicho.toLowerCase());
    if (match) nicho = match;
  }

  // Verifica se o nicho existe nos oficiais, se não, cai em Outros
  if (!NICHOS_OFICIAIS.includes(nicho as Nicho)) {
    nicho = 'Outros';
  }

  // Normalização de categoria para o nicho resolvido
  const categoriasValidas = getCategoriasDoNicho(nicho);
  const matchCat = categoriasValidas.find(c => c.toLowerCase() === categoria.toLowerCase());
  if (matchCat) {
    categoria = matchCat;
  } else {
    categoria = 'Outros';
  }

  return { nicho, categoria };
}
