'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizarNome } from '@/lib/normalizar-nome'
import { ORDENS_POR_MODELO } from '@/lib/mensagens/modelos'
import { TEMPLATES_PADRAO, TEMPLATE_OFERTA, TEMPLATE_FOLLOW_UP } from '@/lib/mensagens/templates_padrao'

const TIPO_POR_ORDEM: Record<number, string> = {
  1: 'agradecimento',
  2: 'relacionamento',
  3: 'recompra',
  4: 'oferta',
  5: 'follow_up',
}

const TEXTO_POR_TIPO: Record<string, string> = {
  agradecimento: TEMPLATES_PADRAO[0].texto,
  relacionamento: TEMPLATES_PADRAO[1].texto,
  recompra: TEMPLATES_PADRAO[2].texto,
  oferta: TEMPLATE_OFERTA.texto,
  follow_up: TEMPLATE_FOLLOW_UP.texto,
}

function calcDiasAposVenda(tipo: string, ciclo: number): number {
  const N = ciclo
  const rel = Math.max(0, Math.floor(N / 2))
  const rec = Math.max(rel, N - 5)
  const ofe = Math.max(rec, N - 1)
  if (tipo === 'agradecimento') return 0
  if (tipo === 'relacionamento') return rel
  if (tipo === 'recompra') return rec
  if (tipo === 'oferta') return ofe
  if (tipo === 'follow_up') return Math.max(ofe + 1, N + 2)
  return 0
}

export async function instalarBiblioteca(dados: {
  biblioteca_id: string
  loja_ids: string[]
}): Promise<{
  ok: boolean
  lojasInstaladas: number
  produtosInseridos: number
  produtosIgnorados: number
  erro?: string
}> {
  const zero = { ok: false, lojasInstaladas: 0, produtosInseridos: 0, produtosIgnorados: 0 }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...zero, erro: 'Não autenticado' }

    if (!dados.loja_ids.length) return { ...zero, erro: 'Selecione ao menos uma loja' }

    const admin = createAdminClient()

    // Validate user has active membership in ALL requested lojas
    const { data: membros } = await admin
      .from('membros_loja')
      .select('loja_id')
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .in('loja_id', dados.loja_ids)

    const lojasPermitidas = new Set((membros ?? []).map(m => m.loja_id as string))
    const invalidas = dados.loja_ids.filter(id => !lojasPermitidas.has(id))
    if (invalidas.length > 0) return { ...zero, erro: 'Acesso negado a uma ou mais lojas selecionadas' }

    // Fetch biblioteca itens
    const { data: itens, error: itensErr } = await admin
      .from('biblioteca_itens')
      .select('id, nome, foto_url, preco_sugerido, ciclo_recompra_dias, qtd_mensagens, nicho, parceiro_id, categoria, repasse_ativo, tipo_acordo')
      .eq('biblioteca_id', dados.biblioteca_id)
      .eq('ativo', true)

    if (itensErr || !itens) return { ...zero, erro: itensErr?.message ?? 'Biblioteca não encontrada' }

    // Resolve parceiro names for TEXT legacy field
    const parceiroIds = [...new Set(itens.map(i => i.parceiro_id as string | null).filter(Boolean))] as string[]
    const parceiroNomes: Record<string, string> = {}
    if (parceiroIds.length > 0) {
      const { data: parceiros } = await admin.from('parceiros').select('id, nome').in('id', parceiroIds)
      ;(parceiros ?? []).forEach(p => { parceiroNomes[p.id as string] = p.nome as string })
    }

    let lojasInstaladas = 0
    let produtosInseridos = 0
    let produtosIgnorados = 0

    for (const lojaId of dados.loja_ids) {
      // Upsert instalacao (idempotent — on conflict update ativo=true)
      await admin
        .from('instalacoes_biblioteca')
        .upsert(
          { loja_id: lojaId, biblioteca_id: dados.biblioteca_id, instalado_por: user.id, ativo: true },
          { onConflict: 'loja_id,biblioteca_id' }
        )
      lojasInstaladas++

      // Load existing produtos for dedup
      const { data: existentes } = await admin
        .from('produtos')
        .select('id, nome, biblioteca_item_id')
        .eq('loja_id', lojaId)

      const porItemId = new Set<string>()
      const porNomeNorm = new Set<string>()
      ;(existentes ?? []).forEach(p => {
        if (p.biblioteca_item_id) porItemId.add(p.biblioteca_item_id as string)
        porNomeNorm.add(normalizarNome(p.nome as string))
      })

      for (const item of itens) {
        // Skip if already imported (by FK match or normalized name)
        if (porItemId.has(item.id as string) || porNomeNorm.has(normalizarNome(item.nome as string))) {
          produtosIgnorados++
          continue
        }

        const qtd = Math.min(5, Math.max(1, (item.qtd_mensagens as number) ?? 3)) as 1 | 2 | 3 | 4 | 5
        const ciclo = (item.ciclo_recompra_dias as number) ?? 30
        const parceiroNome = item.parceiro_id ? (parceiroNomes[item.parceiro_id as string] ?? null) : null

        const { data: novoProduto, error: prodErr } = await admin
          .from('produtos')
          .insert({
            loja_id: lojaId,
            nome: item.nome,
            preco_sugerido: item.preco_sugerido,
            foto_url: item.foto_url,
            ativo: true,
            recorrente: true,
            comissionavel_recompra: true,
            qtd_mensagens: qtd,
            nicho: item.nicho,
            parceiro: parceiroNome,
            parceiro_id: item.parceiro_id,
            categoria: item.categoria,
            biblioteca_item_id: item.id,
            repasse_ativo: item.repasse_ativo ?? false,
            tipo_acordo: item.tipo_acordo ?? 'livre',
            galeria_urls: [],
            variantes: [],
          })
          .select('id')
          .single()

        if (prodErr || !novoProduto) continue

        const produtoId = novoProduto.id as string
        const ordens = ORDENS_POR_MODELO[qtd]

        await admin.from('mensagens_produto').insert(
          ordens.map(ordem => {
            const tipo = TIPO_POR_ORDEM[ordem]
            return {
              produto_id: produtoId,
              ordem,
              tipo,
              texto: TEXTO_POR_TIPO[tipo] ?? '',
              dias_apos_venda: calcDiasAposVenda(tipo, ciclo),
              estilo: 'clean',
              tipo_incentivo: 'nenhum',
            }
          })
        )

        porItemId.add(item.id as string)
        porNomeNorm.add(normalizarNome(item.nome as string))
        produtosInseridos++
      }
    }

    return { ok: true, lojasInstaladas, produtosInseridos, produtosIgnorados }
  } catch (err) {
    return { ...zero, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
