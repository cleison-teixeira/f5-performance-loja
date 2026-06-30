'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function salvarLoja(dados: {
  empresa_id: string
  empresa_nome: string
  loja_id: string
  loja_nome: string
  cidade: string
  endereco: string
  whatsapp: string
  email: string
  ativa: boolean
  nichos: string[]
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()

    const { error: errEmpresa } = await supabase
      .from('empresas')
      .update({ nome: dados.empresa_nome })
      .eq('id', dados.empresa_id)

    if (errEmpresa) return { ok: false, erro: errEmpresa.message }

    const { error: errLoja } = await supabase
      .from('lojas')
      .update({
        nome: dados.loja_nome,
        cidade: dados.cidade,
        endereco: dados.endereco,
        whatsapp: dados.whatsapp,
        email: dados.email,
        ativa: dados.ativa,
        nichos: dados.nichos || [],
      })
      .eq('id', dados.loja_id)

    if (errLoja) return { ok: false, erro: errLoja.message }

    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}

export async function adicionarLoja(dados: {
  empresa_id: string
  nome: string
  cidade: string
  whatsapp: string
  email: string
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: 'Não autenticado' }

    const { data: membro } = await supabase
      .from('membros_loja')
      .select('role')
      .eq('perfil_id', user.id)
      .eq('ativo', true)
      .limit(1)
      .single()

    if (!membro || !['dono', 'admin_f5'].includes(membro.role as string)) {
      return { ok: false, erro: 'Sem permissão para adicionar lojas' }
    }

    const admin = createAdminClient()

    const { data: novaLoja, error: errLoja } = await admin
      .from('lojas')
      .insert({ empresa_id: dados.empresa_id, nome: dados.nome, cidade: dados.cidade || null, whatsapp: dados.whatsapp || null, email: dados.email || null, ativa: true })
      .select('id')
      .single()

    if (errLoja || !novaLoja) return { ok: false, erro: errLoja?.message ?? 'Erro ao criar loja' }

    const { error: errMembro } = await admin
      .from('membros_loja')
      .insert({ perfil_id: user.id, loja_id: (novaLoja as { id: string }).id, role: membro.role, ativo: true })

    if (errMembro) return { ok: false, erro: errMembro.message }

    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
