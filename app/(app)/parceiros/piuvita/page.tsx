export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PiuvitaClient, type ProdutoCatalogo } from './PiuvitaClient'

const ROLE_PRIORITY: Record<string, number> = { dono: 0, admin_f5: 0, gerente: 1, lider: 1, vendedora: 2 }

export default async function PiuvitaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: todosMembros } = await admin
    .from('membros_loja')
    .select('role, loja_id')
    .eq('perfil_id', user.id)
    .eq('ativo', true)

  const melhorMembro = (todosMembros ?? []).sort(
    (a, b) => (ROLE_PRIORITY[a.role as string] ?? 99) - (ROLE_PRIORITY[b.role as string] ?? 99)
  )[0]

  const role = (melhorMembro?.role ?? 'vendedora') as string
  const lojaUnica = todosMembros?.length === 1 ? (todosMembros[0].loja_id as string | null) : null

  const { data: piuvitaDb } = await admin
    .from('parceiros')
    .select('id, logo_url')
    .eq('slug', 'piuvita')
    .maybeSingle()

  let produtosCount = 0
  let isInstalado = false
  let produtosCatalogo: ProdutoCatalogo[] = []

  if (piuvitaDb?.id) {
    const { data: bib } = await admin
      .from('bibliotecas')
      .select('id')
      .eq('parceiro_id', piuvitaDb.id)
      .eq('ativo', true)
      .maybeSingle()

    if (bib?.id) {
      const [contagem, itens, instalacao] = await Promise.all([
        admin
          .from('biblioteca_itens')
          .select('*', { count: 'exact', head: true })
          .eq('biblioteca_id', bib.id)
          .eq('ativo', true),
        admin
          .from('biblioteca_itens')
          .select('id, nome, foto_url, preco_sugerido, ciclo_recompra_dias')
          .eq('biblioteca_id', bib.id)
          .eq('ativo', true)
          .order('nome'),
        lojaUnica
          ? admin
              .from('instalacoes_biblioteca')
              .select('id')
              .eq('loja_id', lojaUnica)
              .eq('biblioteca_id', bib.id)
              .eq('ativo', true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      produtosCount = contagem.count ?? 0
      produtosCatalogo = (itens.data ?? []).map(i => ({
        id: i.id as string,
        nome: i.nome as string,
        foto_url: i.foto_url as string | null,
        preco_sugerido: i.preco_sugerido as number | null,
        ciclo_recompra_dias: i.ciclo_recompra_dias as number | null,
      }))
      isInstalado = !!(instalacao as { data: unknown }).data
    }
  }

  const logoUrl: string | null = piuvitaDb?.logo_url ?? null

  return (
    <div className="space-y-6">
      <Link
        href="/parceiros"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        F5 Partners
      </Link>

      <PiuvitaClient
        logoUrl={logoUrl}
        produtosCount={produtosCount}
        role={role}
        lojaId={lojaUnica}
        isInstalado={isInstalado}
        produtosCatalogo={produtosCatalogo}
      />
    </div>
  )
}
