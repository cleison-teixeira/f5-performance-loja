export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'
import { ListaProdutos } from './ListaProdutos'
import { TEMPLATES_PADRAO } from '@/lib/mensagens/templates_padrao'
import { normalizarNicho } from '@/lib/config/produtos-segmentos'

export interface MensagemSlot {
  id: string | null
  ordem: 1 | 2 | 3 | 4 | 5
  tipo: 'agradecimento' | 'relacionamento' | 'recompra' | 'oferta' | 'follow_up'
  texto: string
  dias_apos_venda: number
  estilo?: string | null
  tipo_incentivo?: string | null
  cupom_codigo?: string | null
  desconto_percentual?: number | null
  desconto_valor?: number | null
  beneficio_texto?: string | null
  validade_oferta?: string | null
}

export interface ProdutoItem {
  id: string
  nome: string
  preco_sugerido: number | null
  foto_url: string | null
  ativo: boolean
  recorrente: boolean
  comissionavel_recompra: boolean
  qtd_mensagens: 1 | 2 | 3 | 4 | 5
  nicho?: string | null
  parceiro?: string | null
  categoria?: string | null
  galeria_urls?: string[] | null
  variantes?: string[] | null
  mensagens: MensagemSlot[]
}

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export default async function ConfigProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: todosMembros } = await admin
    .from('membros_loja')
    .select('role')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  if (!todosMembros || todosMembros.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Produtos e mensagens</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const userRole = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const multiLoja = !isAcessoLoja(userRole)
  const ctx = await getContextoLoja(user.id, multiLoja)

  if (ctx.escopo === 'rede') {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Produtos e mensagens</h1>
        <p className="text-sm text-muted-foreground">
          Selecione uma loja no seletor <strong>Visão</strong> acima para gerenciar produtos desta unidade.
        </p>
      </div>
    )
  }

  if (!ctx.lojaId) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Produtos e mensagens</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const loja_id = ctx.lojaId
  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(userRole)

  const { data: lojaRes } = await admin
    .from('lojas')
    .select('nichos')
    .eq('id', loja_id)
    .single()
  const lojaNichos = (Array.isArray(lojaRes?.nichos) ? (lojaRes.nichos as string[]) : [])
    .map(normalizarNicho)
    .filter(Boolean)

  const { data: produtosRaw } = await supabase
    .from('produtos')
    .select('id, nome, preco_sugerido, foto_url, ativo, recorrente, comissionavel_recompra, qtd_mensagens, nicho, parceiro, categoria, galeria_urls, variantes, mensagens_produto(id, ordem, tipo, texto, dias_apos_venda, estilo, tipo_incentivo, cupom_codigo, desconto_percentual, desconto_valor, beneficio_texto, validade_oferta)')
    .eq('loja_id', loja_id)
    .order('nome')
    .limit(300)

  const produtos: ProdutoItem[] = (produtosRaw ?? []).map(p => {
    const mensagensDB = (p.mensagens_produto as unknown as Array<{
      id: string; ordem: number; tipo: string; texto: string; dias_apos_venda: number; estilo?: string; tipo_incentivo?: string; cupom_codigo?: string; desconto_percentual?: number; desconto_valor?: number; beneficio_texto?: string; validade_oferta?: string
    }>) ?? []

    const mensagens: MensagemSlot[] = [
      ...TEMPLATES_PADRAO.map(slot => {
        const existente = mensagensDB.find(m => m.ordem === slot.ordem)
        return existente
          ? {
              id: existente.id,
              ordem: slot.ordem,
              tipo: slot.tipo,
              texto: existente.texto,
              dias_apos_venda: existente.dias_apos_venda,
              estilo: existente.estilo,
              tipo_incentivo: existente.tipo_incentivo,
              cupom_codigo: existente.cupom_codigo,
              desconto_percentual: existente.desconto_percentual,
              desconto_valor: existente.desconto_valor,
              beneficio_texto: existente.beneficio_texto,
              validade_oferta: existente.validade_oferta
            }
          : {
              id: null,
              ordem: slot.ordem,
              tipo: slot.tipo,
              texto: slot.texto,
              dias_apos_venda: slot.dias_apos_venda,
              estilo: 'clean',
              tipo_incentivo: 'nenhum',
              cupom_codigo: '',
              desconto_percentual: null,
              desconto_valor: null,
              beneficio_texto: '',
              validade_oferta: ''
            }
      }),
      (() => {
        const existente = mensagensDB.find(m => m.ordem === 4)
        return existente
          ? {
              id: existente.id,
              ordem: 4 as const,
              tipo: 'oferta' as const,
              texto: existente.texto,
              dias_apos_venda: existente.dias_apos_venda,
              estilo: existente.estilo,
              tipo_incentivo: existente.tipo_incentivo,
              cupom_codigo: existente.cupom_codigo,
              desconto_percentual: existente.desconto_percentual,
              desconto_valor: existente.desconto_valor,
              beneficio_texto: existente.beneficio_texto,
              validade_oferta: existente.validade_oferta
            }
          : {
              id: null,
              ordem: 4 as const,
              tipo: 'oferta' as const,
              texto: '',
              dias_apos_venda: 45,
              estilo: 'clean',
              tipo_incentivo: 'nenhum',
              cupom_codigo: '',
              desconto_percentual: null,
              desconto_valor: null,
              beneficio_texto: '',
              validade_oferta: ''
            }
      })(),
      (() => {
        const existente = mensagensDB.find(m => m.ordem === 5)
        return existente
          ? {
              id: existente.id,
              ordem: 5 as const,
              tipo: 'follow_up' as const,
              texto: existente.texto,
              dias_apos_venda: existente.dias_apos_venda,
              estilo: existente.estilo,
              tipo_incentivo: existente.tipo_incentivo,
              cupom_codigo: existente.cupom_codigo,
              desconto_percentual: existente.desconto_percentual,
              desconto_valor: existente.desconto_valor,
              beneficio_texto: existente.beneficio_texto,
              validade_oferta: existente.validade_oferta
            }
          : {
              id: null,
              ordem: 5 as const,
              tipo: 'follow_up' as const,
              texto: '',
              dias_apos_venda: 32,
              estilo: 'clean',
              tipo_incentivo: 'nenhum',
              cupom_codigo: '',
              desconto_percentual: null,
              desconto_valor: null,
              beneficio_texto: '',
              validade_oferta: ''
            }
      })()
    ]

    return {
      id: p.id as string,
      nome: p.nome as string,
      preco_sugerido: p.preco_sugerido as number | null,
      foto_url: (p as unknown as { foto_url: string | null }).foto_url,
      ativo: p.ativo as boolean,
      recorrente: ((p as unknown as { recorrente: boolean }).recorrente) ?? true,
      comissionavel_recompra: ((p as unknown as { comissionavel_recompra: boolean }).comissionavel_recompra) ?? true,
      qtd_mensagens: ((p as unknown as { qtd_mensagens: number }).qtd_mensagens ?? 3) as 1 | 2 | 3 | 4 | 5,
      nicho: (p as any).nicho,
      parceiro: (p as any).parceiro,
      categoria: (p as any).categoria,
      galeria_urls: (p as any).galeria_urls,
      variantes: (p as any).variantes,
      mensagens,
    }
  })

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Produtos e mensagens</h1>
        <p className="text-sm text-muted-foreground">{ctx.lojaNome}</p>
      </div>
      <ListaProdutos produtos={produtos} loja_id={loja_id} podeEditar={podeEditar} lojaNichos={lojaNichos} />
    </div>
  )
}
