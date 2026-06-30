export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { getContextoLoja } from '@/lib/loja/contexto'
import { BibliotecasClient } from './BibliotecasClient'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }

export interface BibliotecaItem {
  id: string
  nome: string
  slug: string
  descricao: string | null
  nicho: string | null
  parceiro_nome: string | null
  parceiro_logo: string | null
  qtd_itens: number
}

export default async function ConfigBibliotecasPage() {
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
        <h1 className="text-xl font-semibold">Bibliotecas</h1>
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

  if (ctx.lojaIds.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Bibliotecas</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  // Fetch apenas bibliotecas de parceiros (exclui F5 Geral que tem parceiro_id NULL)
  const { data: bibliotecasRaw } = await admin
    .from('bibliotecas')
    .select('id, nome, slug, descricao, nicho, parceiro_id')
    .eq('ativo', true)
    .not('parceiro_id', 'is', null)
    .order('nome')

  // Resolve parceiro names and logos separately
  const parceiroIds = [...new Set(
    (bibliotecasRaw ?? []).map(b => b.parceiro_id as string | null).filter(Boolean)
  )] as string[]

  const parceiroMap: Record<string, { nome: string; logo_url: string | null }> = {}
  if (parceiroIds.length > 0) {
    const { data: parceiros } = await admin
      .from('parceiros')
      .select('id, nome, logo_url')
      .in('id', parceiroIds)
    ;(parceiros ?? []).forEach(p => {
      parceiroMap[p.id as string] = { nome: p.nome as string, logo_url: p.logo_url as string | null }
    })
  }

  // Count active itens per biblioteca
  const { data: contagemRaw } = await admin
    .from('biblioteca_itens')
    .select('biblioteca_id')
    .eq('ativo', true)

  const contagemPorBiblioteca: Record<string, number> = {}
  ;(contagemRaw ?? []).forEach(item => {
    const bid = item.biblioteca_id as string
    contagemPorBiblioteca[bid] = (contagemPorBiblioteca[bid] ?? 0) + 1
  })

  // Fetch instalacoes for all lojas the user can access
  const { data: instalacoesRaw } = await admin
    .from('instalacoes_biblioteca')
    .select('loja_id, biblioteca_id')
    .in('loja_id', ctx.lojaIds)
    .eq('ativo', true)

  const instaladosSet = new Set((instalacoesRaw ?? []).map(i => `${i.loja_id}:${i.biblioteca_id}`))

  const bibliotecas: BibliotecaItem[] = (bibliotecasRaw ?? []).map(b => ({
    id: b.id as string,
    nome: b.nome as string,
    slug: b.slug as string,
    descricao: b.descricao as string | null,
    nicho: b.nicho as string | null,
    parceiro_nome: b.parceiro_id ? (parceiroMap[b.parceiro_id as string]?.nome ?? null) : null,
    parceiro_logo: b.parceiro_id ? (parceiroMap[b.parceiro_id as string]?.logo_url ?? null) : null,
    qtd_itens: contagemPorBiblioteca[b.id as string] ?? 0,
  }))

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Bibliotecas</h1>
        <p className="text-sm text-muted-foreground">
          Instale catálogos de produtos e treinamentos prontos para acelerar a operação da loja.
        </p>
      </div>
      <BibliotecasClient
        bibliotecas={bibliotecas}
        lojas={ctx.lojas}
        lojaId={ctx.lojaId}
        instalados={[...instaladosSet]}
        multiLoja={multiLoja}
      />
    </div>
  )
}
