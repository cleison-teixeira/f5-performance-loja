import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormLoja } from './FormLoja'

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

  return (
    <div className="space-y-4 max-w-lg mx-auto">
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
    </div>
  )
}
