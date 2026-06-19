import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function formatarBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ProdutosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membro } = await supabase
    .from('membros_loja')
    .select('loja_id, role, lojas(nome)')
    .eq('perfil_id', user.id)
    .eq('ativo', true)
    .limit(1)
    .single()

  if (!membro) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">Produtos</h1>
        <p className="text-sm text-muted-foreground">Você ainda não pertence a nenhuma loja.</p>
      </div>
    )
  }

  const lojaRaw = membro.lojas as unknown as { nome: string } | Array<{ nome: string }>
  const lojaNome = (Array.isArray(lojaRaw) ? lojaRaw[0] : lojaRaw)?.nome ?? ''
  const loja_id = membro.loja_id as string
  const podeEditar = ['gerente', 'dono', 'admin_f5'].includes(membro.role as string)

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, preco_sugerido, foto_url')
    .eq('loja_id', loja_id)
    .eq('ativo', true)
    .order('nome')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{lojaNome}</p>
        </div>
        {podeEditar && (
          <Link href="/configuracoes/produtos" className="text-sm text-primary hover:underline">
            Gerenciar →
          </Link>
        )}
      </div>

      {(produtos ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {(produtos ?? []).map(p => {
            const fotoUrl = (p as unknown as { foto_url: string | null }).foto_url
            return (
              <div key={p.id as string} className="rounded-lg border bg-card px-4 py-3 flex items-center gap-3">
                {fotoUrl ? (
                  <img src={fotoUrl} alt={p.nome as string} className="w-10 h-10 rounded object-cover shrink-0 border" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                    {(p.nome as string).charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nome as string}</p>
                </div>
                {p.preco_sugerido != null && (
                  <p className="text-sm text-muted-foreground shrink-0">{formatarBRL(p.preco_sugerido as number)}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
