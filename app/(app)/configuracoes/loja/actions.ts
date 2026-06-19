'use server'
import { createClient } from '@/lib/supabase/server'

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
      })
      .eq('id', dados.loja_id)

    if (errLoja) return { ok: false, erro: errLoja.message }

    return { ok: true }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro inesperado' }
  }
}
