'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { validarMesmaRede, getGrupoRedeDaLoja } from '@/lib/rede/grupo-rede'

export type StatusDemandaRede = 'em_busca' | 'encontrado' | 'separado' | 'resolvido' | 'cancelado'
export type TipoResposta = 'tenho_estoque' | 'posso_separar'

export interface DemandaRedeResposta {
  id: string
  demanda_id: string
  loja_resposta_id: string
  loja_resposta_nome: string
  usuario_resposta_id: string | null
  usuario_resposta_nome: string | null
  tipo_resposta: TipoResposta
  quantidade_disponivel: number | null
  observacao: string | null
  criado_em: string
}

export interface DemandaRede {
  id: string
  grupo_rede_id: string | null
  loja_origem_id: string
  loja_origem_nome: string
  responsavel_origem_id: string | null
  responsavel_origem_nome: string | null
  lista_espera_id: string | null
  produto_id: string | null
  produto_nome: string
  quantidade: number
  observacao_operacional: string | null
  status: StatusDemandaRede
  criado_em: string
  respostas: DemandaRedeResposta[]
}

async function validarMembroLoja(lojaId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: membro } = await supabase
    .from('membros_loja')
    .select('role')
    .eq('loja_id', lojaId)
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .maybeSingle()
  return membro ? user.id : null
}

export async function criarDemandaRede(input: {
  lojaOrigemId: string
  lojaOrigemNome: string
  responsavelOrigemId: string | null
  responsavelOrigemNome: string | null
  listaEsperaId: string
  produtoId: string | null
  produtoNome: string
  quantidade: number
  observacaoOperacional: string | null
}): Promise<{ ok: boolean; data?: { id: string }; error?: string }> {
  const userId = await validarMembroLoja(input.lojaOrigemId)
  if (!userId) return { ok: false, error: 'Você não pertence a esta loja.' }

  // Buscar grupo_rede_id da loja origem no servidor (não confiamos no cliente)
  const grupoRede = await getGrupoRedeDaLoja(input.lojaOrigemId)
  if (!grupoRede) {
    return { ok: false, error: 'Esta loja ainda não está vinculada a uma rede. Contate o suporte.' }
  }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('demandas_rede')
    .select('id')
    .eq('lista_espera_id', input.listaEsperaId)
    .eq('loja_origem_id', input.lojaOrigemId)
    .in('status', ['em_busca', 'encontrado', 'separado'])
    .maybeSingle()

  if (existing) return { ok: false, error: 'Já existe uma demanda ativa para este item.' }

  const { data, error } = await admin
    .from('demandas_rede')
    .insert({
      grupo_rede_id: grupoRede.id,
      loja_origem_id: input.lojaOrigemId,
      loja_origem_nome: input.lojaOrigemNome,
      responsavel_origem_id: input.responsavelOrigemId,
      responsavel_origem_nome: input.responsavelOrigemNome,
      lista_espera_id: input.listaEsperaId,
      produto_id: input.produtoId,
      produto_nome: input.produtoNome,
      quantidade: input.quantidade,
      observacao_operacional: input.observacaoOperacional,
      status: 'em_busca',
      criado_por: userId,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  revalidatePath('/lista-espera')
  revalidatePath('/demandas-rede')
  return { ok: true, data: { id: (data as { id: string }).id } }
}

export async function responderDemandaRede(input: {
  demandaId: string
  lojaRespostaId: string
  lojaRespostaNome: string
  usuarioRespostaNome: string | null
  tipoResposta: TipoResposta
  quantidadeDisponivel: number | null
  observacao: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarMembroLoja(input.lojaRespostaId)
  if (!userId) return { ok: false, error: 'Você não pertence a esta loja.' }

  const admin = createAdminClient()

  const { data: demanda } = await admin
    .from('demandas_rede')
    .select('id, status, loja_origem_id, grupo_rede_id')
    .eq('id', input.demandaId)
    .maybeSingle()

  if (!demanda) return { ok: false, error: 'Demanda não encontrada.' }
  if (demanda.status === 'resolvido' || demanda.status === 'cancelado') {
    return { ok: false, error: 'Esta demanda já foi encerrada.' }
  }
  if ((demanda as { loja_origem_id: string }).loja_origem_id === input.lojaRespostaId) {
    return { ok: false, error: 'A loja solicitante não pode responder à própria demanda.' }
  }

  // Validar que loja_resposta pertence ao mesmo grupo_rede_id
  const mesmRede = await validarMesmaRede(
    (demanda as { loja_origem_id: string }).loja_origem_id,
    input.lojaRespostaId
  )
  if (!mesmRede) {
    return { ok: false, error: 'Sua loja não pertence à mesma rede.' }
  }

  const { error: respError } = await admin
    .from('demandas_rede_respostas')
    .insert({
      demanda_id: input.demandaId,
      loja_resposta_id: input.lojaRespostaId,
      loja_resposta_nome: input.lojaRespostaNome,
      usuario_resposta_id: userId,
      usuario_resposta_nome: input.usuarioRespostaNome,
      tipo_resposta: input.tipoResposta,
      quantidade_disponivel: input.quantidadeDisponivel,
      observacao: input.observacao,
    })

  if (respError) return { ok: false, error: respError.message }

  const novoStatus = input.tipoResposta === 'tenho_estoque' ? 'encontrado' : 'separado'
  await admin
    .from('demandas_rede')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', input.demandaId)

  revalidatePath('/demandas-rede')
  revalidatePath('/lista-espera')
  return { ok: true }
}

export async function resolverDemandaRede(
  demandaId: string,
  lojaOrigemId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarMembroLoja(lojaOrigemId)
  if (!userId) return { ok: false, error: 'Você não pertence a esta loja.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('demandas_rede')
    .update({ status: 'resolvido', resolvido_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq('id', demandaId)
    .eq('loja_origem_id', lojaOrigemId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/demandas-rede')
  revalidatePath('/lista-espera')
  return { ok: true }
}

export async function cancelarDemandaRede(
  demandaId: string,
  lojaOrigemId: string
): Promise<{ ok: boolean; error?: string }> {
  const userId = await validarMembroLoja(lojaOrigemId)
  if (!userId) return { ok: false, error: 'Você não pertence a esta loja.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('demandas_rede')
    .update({ status: 'cancelado', cancelado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() })
    .eq('id', demandaId)
    .eq('loja_origem_id', lojaOrigemId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/demandas-rede')
  revalidatePath('/lista-espera')
  return { ok: true }
}
