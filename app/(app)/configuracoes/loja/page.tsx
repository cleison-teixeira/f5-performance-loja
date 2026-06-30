export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAcessoLoja } from '@/lib/acessos/perfil-produto'
import { FormLoja } from './FormLoja'
import { FormAdicionarLoja } from './FormAdicionarLoja'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'

type LojaCompleta = {
  id: string
  nome: string
  cidade: string | null
  endereco: string | null
  whatsapp: string | null
  email: string | null
  ativa: boolean
  empresa_id: string
  empresa: { id: string; nome: string }
  nichos: string[]
}

export default async function ConfigLojaPage({
  searchParams,
}: {
  searchParams: Promise<{ loja_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use admin client to get ALL active lojas for this user — same pattern as equipe page
  const admin = createAdminClient()
  const { data: todosMembros } = await admin
    .from('membros_loja')
    .select('loja_id, role, lojas(id, nome, cidade, endereco, whatsapp, email, ativa, empresa_id, nichos, empresas(id, nome))')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  if (!todosMembros || todosMembros.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Configurações da loja</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  // Derive effective role
  const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, vendedora: 2 }
  const role = todosMembros.reduce((best: string, m) => {
    const mRole = m.role as string
    return (ROLE_PRIORITY[mRole] ?? 99) < (ROLE_PRIORITY[best] ?? 99) ? mRole : best
  }, todosMembros[0].role as string)

  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(role)
  const multiLoja = !isAcessoLoja(role)

  // Build deduplicated loja list
  const seen = new Set<string>()
  const todasLojas: LojaCompleta[] = []

  for (const m of todosMembros) {
    const lojaRaw = m.lojas as unknown as {
      id: string; nome: string; cidade: string | null; endereco: string | null
      whatsapp: string | null; email: string | null; ativa: boolean; empresa_id: string
      nichos: string[] | null
      empresas: { id: string; nome: string } | Array<{ id: string; nome: string }> | null
    } | Array<{
      id: string; nome: string; cidade: string | null; endereco: string | null
      whatsapp: string | null; email: string | null; ativa: boolean; empresa_id: string
      nichos: string[] | null
      empresas: { id: string; nome: string } | Array<{ id: string; nome: string }> | null
    }> | null

    const lojaItem = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw
    if (!lojaItem || seen.has(lojaItem.id)) continue
    seen.add(lojaItem.id)

    const empRaw = lojaItem.empresas
    const empresa = Array.isArray(empRaw) ? empRaw[0] : empRaw

    todasLojas.push({
      id: lojaItem.id,
      nome: lojaItem.nome,
      cidade: lojaItem.cidade,
      endereco: lojaItem.endereco,
      whatsapp: lojaItem.whatsapp,
      email: lojaItem.email,
      ativa: lojaItem.ativa,
      empresa_id: lojaItem.empresa_id,
      empresa: empresa ? { id: empresa.id, nome: empresa.nome } : { id: '', nome: '' },
      nichos: Array.isArray(lojaItem.nichos) ? (lojaItem.nichos as string[]) : [],
    })
  }

  const { loja_id: lojaIdParam } = await searchParams

  // For single-loja: always edit the one loja
  // For multi-loja: edit only when loja_id is in URL and belongs to user
  const lojaEditando: LojaCompleta | null = multiLoja
    ? (lojaIdParam ? (todasLojas.find(l => l.id === lojaIdParam) ?? null) : null)
    : (todasLojas[0] ?? null)

  // Single-loja: simple edit page
  if (!multiLoja) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div>
          <h1 className="text-xl font-semibold">Configurações da loja</h1>
          {lojaEditando && <p className="text-sm text-muted-foreground">{lojaEditando.nome}</p>}
        </div>
        {lojaEditando && (
          <FormLoja
            key={lojaEditando.id}
            empresa={lojaEditando.empresa}
            loja={{
              id: lojaEditando.id,
              nome: lojaEditando.nome,
              cidade: lojaEditando.cidade ?? '',
              endereco: lojaEditando.endereco ?? '',
              whatsapp: lojaEditando.whatsapp ?? '',
              email: lojaEditando.email ?? '',
              ativa: lojaEditando.ativa,
              nichos: lojaEditando.nichos,
            }}
            podeEditar={podeEditar}
          />
        )}
      </div>
    )
  }

  // Multi-loja: list + optional edit form
  const empresa_id_padrao = todasLojas[0]?.empresa.id ?? ''

  return (
    <div className="space-y-6 max-w-lg mx-auto">

      {/* Edit form for selected loja */}
      {lojaEditando ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href="/configuracoes/loja"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Lojas da rede
            </Link>
          </div>
          <div>
            <h1 className="text-xl font-semibold">Editando unidade</h1>
            <p className="text-sm text-muted-foreground">{lojaEditando.nome}</p>
          </div>
          <FormLoja
            key={lojaEditando.id}
            empresa={lojaEditando.empresa}
            loja={{
              id: lojaEditando.id,
              nome: lojaEditando.nome,
              cidade: lojaEditando.cidade ?? '',
              endereco: lojaEditando.endereco ?? '',
              whatsapp: lojaEditando.whatsapp ?? '',
              email: lojaEditando.email ?? '',
              ativa: lojaEditando.ativa,
              nichos: lojaEditando.nichos,
            }}
            podeEditar={podeEditar}
          />
        </div>
      ) : (
        <div>
          <h1 className="text-xl font-semibold">Lojas da rede</h1>
          <p className="text-xs text-muted-foreground mt-1">Selecione uma unidade para editar.</p>
        </div>
      )}

      {/* List of all lojas with edit links */}
      <div className="space-y-2">
        {!lojaEditando && <h2 className="text-sm font-semibold text-foreground">Unidades</h2>}
        {todasLojas.map(l => (
          <div
            key={l.id}
            className={`rounded-lg border bg-card p-3 space-y-1 ${l.id === lojaEditando?.id ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{l.nome}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${l.ativa ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                  {l.ativa ? 'Ativa' : 'Inativa'}
                </span>
                {podeEditar && (
                  <Link
                    href={`/configuracoes/loja?loja_id=${l.id}`}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Editar
                  </Link>
                )}
              </div>
            </div>
            {l.cidade && <p className="text-xs text-muted-foreground">{l.cidade}</p>}
            <div className="flex gap-3 text-xs text-muted-foreground">
              {l.whatsapp && <span>{formatarWhatsapp(l.whatsapp)}</span>}
              {l.email && <span>{l.email}</span>}
            </div>
          </div>
        ))}
      </div>

      <FormAdicionarLoja empresa_id={empresa_id_padrao} />
    </div>
  )
}
