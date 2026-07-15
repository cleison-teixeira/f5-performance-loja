export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Star, ArrowRight, PlayCircle, Package, Megaphone } from 'lucide-react'
import { piuvitaPerfil } from '@/lib/config/parceiros/piuvita'

export default async function ParceirosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: piuvitaDb } = await admin
    .from('parceiros')
    .select('id, nome, logo_url')
    .eq('slug', 'piuvita')
    .maybeSingle()

  let produtosCount = 0
  if (piuvitaDb?.id) {
    const { data: bib } = await admin
      .from('bibliotecas')
      .select('id')
      .eq('parceiro_id', piuvitaDb.id)
      .eq('ativo', true)
      .maybeSingle()

    if (bib?.id) {
      const { count } = await admin
        .from('biblioteca_itens')
        .select('*', { count: 'exact', head: true })
        .eq('biblioteca_id', bib.id)
        .eq('ativo', true)
      produtosCount = count ?? 0
    }
  }

  const logoUrl: string | null = piuvitaDb?.logo_url ?? null
  const totalCapacitacoes = piuvitaPerfil.colecoes.reduce((acc, c) => acc + c.videos.length, 0)

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">F5 Partners</h1>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-400">
            Premium
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Marcas parceiras com capacitação e catálogo exclusivos para sua loja.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
        <Star className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Parceiros selecionados pelo time F5 Recompra. Acesse treinamentos exclusivos, conheça o catálogo de produtos e ative as bibliotecas na sua loja.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parceiros ativos</p>

        <Link
          href="/parceiros/piuvita"
          className="block rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors group"
        >
          <div className="flex items-start gap-4">
            {logoUrl ? (
              <div className="rounded-lg border bg-white px-2.5 py-1.5 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="PiùVita"
                  className="h-9 w-auto max-w-[100px] object-contain"
                />
              </div>
            ) : (
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 text-emerald-700 dark:text-emerald-400 font-bold text-sm px-3 py-2">
                PiùVita
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{piuvitaPerfil.nome}</p>
                <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                  {piuvitaPerfil.categoria}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">Catálogo, capacitações e campanhas para ajudar as lojas a vender melhor os produtos da marca.</p>
              <div className="flex flex-wrap gap-4 mt-3">
                {produtosCount > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {produtosCount} produtos no catálogo
                  </span>
                )}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <PlayCircle className="h-3.5 w-3.5" />
                  {totalCapacitacoes} capacitações
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Megaphone className="h-3.5 w-3.5" />
                  Campanhas e materiais disponíveis
                </span>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-1" />
          </div>
        </Link>
      </div>

      <div className="rounded-xl border border-dashed p-5 text-center space-y-2">
        <p className="text-sm font-medium">Sua marca aqui</p>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Fabricante ou distribuidor? Fale com o time F5 e leve seus produtos para as lojas parceiras.
        </p>
        <a
          href="https://wa.me/5548988371216"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Falar com o time F5
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}
