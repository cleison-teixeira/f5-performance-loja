import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMembrosAtivos, getContextoLoja, type ContextoLoja } from '@/lib/loja/contexto'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { measureAsync, startTimer } from '@/lib/performance/timing'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export interface AppContext {
  user: { id: string; email: string | undefined }
  perfil: { nome: string } | null
  role: string
  isAcessoRede: boolean
  multiLoja: boolean
  ctx: ContextoLoja
  lojaId: string | null
  lojaIds: string[]
  lojaNome: string
  lojas: { id: string; nome: string }[]
  hasMembros: boolean
}

// cache() do React deduplica chamadas por request — layout e page compartilham o mesmo resultado.
// Não há cache entre usuários nem entre requests. Seguro para dados sensíveis.
export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const endTotal = startTimer('getAppContext:total')

  const supabase = await createClient()
  const { data: { user } } = await measureAsync('getAppContext:auth.getUser', () =>
    supabase.auth.getUser()
  )
  if (!user) {
    endTotal()
    return null
  }

  const admin = createAdminClient()
  const [perfilRes, todosMembros, libRes] = await measureAsync(
    'getAppContext:parallel[perfis+membros+liberacoes]',
    () => Promise.all([
      supabase.from('perfis').select('nome').eq('id', user.id).single(),
      getMembrosAtivos(user.id),  // cached — getContextoLoja reutiliza sem nova query
      admin.from('liberacoes_acesso')
        .select('tipo, status')
        .eq('email', (user.email ?? '').toLowerCase())
        .in('status', ['aplicado', 'ativo']),
    ])
  )

  const emptyCtx: ContextoLoja = { lojas: [], lojaId: null, escopo: 'loja', lojaIds: [], lojaNome: '' }

  if (todosMembros.length === 0) {
    endTotal()
    return {
      user: { id: user.id, email: user.email },
      perfil: perfilRes.data ? { nome: perfilRes.data.nome as string } : null,
      role: '',
      isAcessoRede: false,
      multiLoja: false,
      ctx: emptyCtx,
      lojaId: null,
      lojaIds: [],
      lojaNome: '',
      lojas: [],
      hasMembros: false,
    }
  }

  const role = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const libData = libRes.data
  const isAcessoRede = role === 'admin_f5' || (libData ?? []).some(l => l.tipo === 'rede')
  const multiLoja = !isAcessoLoja(role)

  const ctx = await measureAsync('getAppContext:getContextoLoja', () =>
    getContextoLoja(user.id, multiLoja)
  )

  endTotal()

  return {
    user: { id: user.id, email: user.email },
    perfil: perfilRes.data ? { nome: perfilRes.data.nome as string } : null,
    role,
    isAcessoRede,
    multiLoja,
    ctx,
    lojaId: ctx.lojaId,
    lojaIds: ctx.lojaIds,
    lojaNome: ctx.lojaNome,
    lojas: ctx.lojas,
    hasMembros: true,
  }
})
