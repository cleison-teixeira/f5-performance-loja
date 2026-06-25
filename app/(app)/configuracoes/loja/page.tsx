import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { isAcessoMultiloja } from '@/lib/acessos/perfil-produto'
import { FormLoja } from './FormLoja'
import { FormAdicionarLoja } from './FormAdicionarLoja'
import { formatarWhatsapp } from '@/lib/whatsapp/mask'

export default async function ConfigLojaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(id, nome, cidade, endereco, whatsapp, email, ativa, empresa_id, empresas(id, nome))')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Configurações da loja</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const role = membro.role as string
  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(role)
  const multiLoja = isAcessoMultiloja(role)

  const lojaRaw = membro.lojas as unknown as {
    id: string; nome: string; cidade: string | null; endereco: string | null
    whatsapp: string | null; email: string | null; ativa: boolean; empresa_id: string
    empresas: { id: string; nome: string } | Array<{ id: string; nome: string }>
  } | Array<{
    id: string; nome: string; cidade: string | null; endereco: string | null
    whatsapp: string | null; email: string | null; ativa: boolean; empresa_id: string
    empresas: { id: string; nome: string } | Array<{ id: string; nome: string }>
  }>
  const loja = Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw

  const empresaRaw = loja.empresas
  const empresa = Array.isArray(empresaRaw) ? empresaRaw[0] : empresaRaw

  // For multi-loja dono: fetch all lojas in the network
  type LojaItem = {
    id: string; nome: string; cidade: string | null
    whatsapp: string | null; email: string | null; ativa: boolean
  }
  let todasLojas: LojaItem[] = []

  if (multiLoja) {
    const admin = createAdminClient()
    const { data: todosMembros } = await admin
      .from('membros_loja')
      .select('loja_id, lojas(id, nome, cidade, whatsapp, email, ativa)')
      .eq('perfil_id', user.id)
      .eq('ativo', true)

    const seen = new Set<string>()
    for (const m of todosMembros ?? []) {
      const l = m.lojas as unknown as LojaItem | Array<LojaItem> | null
      const lojaItem = Array.isArray(l) ? l[0] : l
      if (lojaItem && !seen.has(lojaItem.id)) {
        seen.add(lojaItem.id)
        todasLojas.push(lojaItem)
      }
    }
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-semibold">Configurações da loja</h1>
        <p className="text-sm text-muted-foreground">{loja.nome}</p>
      </div>

      <FormLoja
        empresa={{ id: empresa.id, nome: empresa.nome }}
        loja={{
          id: loja.id,
          nome: loja.nome,
          cidade: loja.cidade ?? '',
          endereco: loja.endereco ?? '',
          whatsapp: loja.whatsapp ?? '',
          email: loja.email ?? '',
          ativa: loja.ativa,
        }}
        podeEditar={podeEditar}
      />

      {multiLoja && (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Lojas da rede</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Todas as lojas vinculadas à sua conta.</p>
          </div>

          <div className="space-y-2">
            {todasLojas.map(l => (
              <div key={l.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{l.nome}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${l.ativa ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                    {l.ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                {l.cidade && <p className="text-xs text-muted-foreground">{l.cidade}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {l.whatsapp && <span>{formatarWhatsapp(l.whatsapp)}</span>}
                  {l.email && <span>{l.email}</span>}
                </div>
              </div>
            ))}
          </div>

          <FormAdicionarLoja empresa_id={empresa.id} />
        </div>
      )}
    </div>
  )
}
