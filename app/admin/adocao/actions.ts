'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verificarAdminF5() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('membros_loja')
    .select('id')
    .eq('perfil_id', user.id)
    .eq('role', 'admin_f5')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return user
}

export interface MetaAdocaoInput {
  loja_id: string
  vendas_mes_estimadas: number | null
  percentual_recorrente_estimado: number | null
  meta_recorrentes_mes: number | null
  ticket_medio_estimado: number | null
  responsavel_loja_nome: string
  responsavel_loja_whatsapp: string
  origem_meta: string
  data_inicio_acompanhamento: string | null
  observacoes: string
  status: string
}

export async function salvarMetaAdocao(input: MetaAdocaoInput) {
  const user = await verificarAdminF5()
  if (!user) return { ok: false, erro: 'Sem permissão' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('lojas_metas_adocao')
    .upsert(
      {
        loja_id: input.loja_id,
        vendas_mes_estimadas: input.vendas_mes_estimadas,
        percentual_recorrente_estimado: input.percentual_recorrente_estimado,
        meta_recorrentes_mes: input.meta_recorrentes_mes,
        ticket_medio_estimado: input.ticket_medio_estimado,
        responsavel_loja_nome: input.responsavel_loja_nome || null,
        responsavel_loja_whatsapp: input.responsavel_loja_whatsapp || null,
        origem_meta: input.origem_meta || 'manual',
        data_inicio_acompanhamento: input.data_inicio_acompanhamento || null,
        observacoes: input.observacoes || null,
        status: input.status || 'ativo',
        atualizado_por: user.id,
      },
      { onConflict: 'loja_id' }
    )

  if (error) return { ok: false, erro: error.message }

  revalidatePath('/admin/adocao')
  return { ok: true }
}
