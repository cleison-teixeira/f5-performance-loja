import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Este é um teste de GUARDA ESTRUTURAL, não de comportamento em runtime.
//
// O bug original: CardGrupoRecompra é montado com key={grupo.venda_id} (sem o
// tipo) em AvisosLista.tsx, então o React reaproveita a mesma instância ao
// alternar entre as abas Recompra/Oferta/Confirmação. Como
// `useState(primaryAviso.texto_renderizado)` só roda na primeira montagem, o
// texto exibido ficava congelado no valor da primeira aba renderizada.
//
// O comportamento correto em runtime (resincronizar o texto ao trocar de
// aba) já foi validado manualmente em duas rodadas de E2E contra o Preview
// (ver histórico de homologação). Testar isso automaticamente exigiria
// renderizar o componente (@testing-library/react + ambiente DOM), o que não
// está instalado neste projeto e não deve ser adicionado apenas para este
// fix. Este teste garante, por inspeção do código-fonte, que ninguém remova
// silenciosamente o useEffect responsável pela resincronização.

const SRC = readFileSync(
  join(process.cwd(), 'app/(app)/avisos/CardGrupoRecompra.tsx'),
  'utf-8'
)

describe('CardGrupoRecompra — guarda estrutural contra o estado congelado', () => {
  it('G1: existe um useEffect que resincroniza textoAtual a partir de primaryAviso.texto_renderizado', () => {
    const efeito = /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?setTextoAtual\(primaryAviso\.texto_renderizado\)/
    expect(SRC).toMatch(efeito)
  })

  it('G2: esse useEffect depende de primaryAviso.id (identifica quando o grupo/tipo mudou)', () => {
    const dependencias = /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\},\s*\[[^\]]*primaryAviso\.id[^\]]*\]\s*\)/
    expect(SRC).toMatch(dependencias)
  })

  it('G3: useEffect é importado de "react" (pré-requisito para o guard acima funcionar)', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*useEffect[^}]*\}\s*from\s*['"]react['"]/)
  })
})
